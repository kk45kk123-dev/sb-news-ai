# ARCHITECTURE.md — SB News AI 시스템 아키텍처

관련 문서: [DECISIONS.md](./DECISIONS.md)(기술 선택 근거), [DB_SCHEMA.md](./DB_SCHEMA.md)(DDL)

## 1. 개요

SB News AI는 "저축은행 업계 관점 뉴스 해석 엔진"이다. 시스템은 세 개의 배포 단위로 나뉜다.

```
web      Next.js (App Router) — 사용자 UI + API (Route Handlers), 무상태
worker   Node.js — 스케줄러 + 파이프라인 잡 실행, 무상태
postgres PostgreSQL 15+ (pgvector, pg_bigm 확장) — 유일한 상태 저장소
redis    캐시 + BullMQ 잡 큐 + 세션 스토어 + 레이트리밋
```

`web`과 `worker`는 같은 코드 저장소를 공유하지만 별도 컨테이너/프로세스로 실행한다(ADR-001, ADR-004).
두 컴포넌트 모두 무상태이므로 수평 확장 시 인스턴스 추가만으로 대응한다(§17.1).

## 2. 논리 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                      Client (Web, PC 우선)                   │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS, 세션 쿠키(HttpOnly/Secure/SameSite=Lax)
┌───────────────────────────▼─────────────────────────────────┐
│  web (Next.js)                                                │
│  ┌──────────┬──────────┬───────────┬──────────┬──────────┐  │
│  │ Auth API │ News API │ Search API│ Chat API │ Admin API│  │
│  └──────────┴──────────┴───────────┴──────────┴──────────┘  │
│  server/services/*  (도메인 로직, 트랜잭션 경계)                │
│  server/repositories/*  (DB 접근 전용)                        │
│  server/ai/gateway.ts  (★ 모든 LLM 호출이 거치는 단일 지점)    │
└──────┬──────────────────┬───────────────────┬───────────────┘
       │                  │                   │
┌──────▼──────┐   ┌───────▼────────┐   ┌──────▼──────────────┐
│ PostgreSQL  │   │ Redis          │   │ AI Provider (외부)   │
│ +pgvector   │   │ 캐시/큐/세션    │   │ Anthropic / OpenAI   │
│ +pg_bigm    │   └───────┬────────┘   └──────┬──────────────┘
└──────▲──────┘           │                   │
       │           ┌───────▼────────┐   ┌──────▼──────────────┐
       │           │ worker (Node)  │   │ (게이트웨이는 web/worker │
       └───────────┤ BullMQ 스케줄러 │───┤  양쪽에서 동일 모듈 사용)│
                    │ 파이프라인 잡   │   └─────────────────────┘
                    └───────┬────────┘
                    ┌───────▼──────────────────────────────────┐
                    │ Collectors (RSS / API / Scrape 어댑터)    │
                    └──────────────────────────────────────────┘
                                    │
                        외부 출처 (금융위, 금감원, 언론사 RSS 등)
```

## 3. 뉴스 처리 파이프라인

파이프라인은 BullMQ 큐 9개(단계별 1개)로 구현하며, 각 기사의 진행 상태는
`articles.pipeline_stage`로 추적한다. 단계 간 전달은 `article_id`만 넘기고,
각 잡은 DB에서 필요한 데이터를 다시 읽어 처리한다(잡 페이로드 최소화 → 재시도 시 최신 상태 반영).

```
[1] collect     출처(sources) 폴링 → articles 원시 insert (status=collected)
[2] normalize   URL 정규화, 인코딩 보정, 발행일 파싱, HTML 정제
[3] dedupe      url_hash 유니크 제약 + 제목 유사도(trigram) → 중복이면 종료
[4] enrich      원문 본문 추출(raw_content, 임시), 페이월 감지
[5] cluster     24시간 내 유사 기사 클러스터링 → cluster_id, is_cluster_lead 결정
[6] prefilter   경량 규칙 + 소형 모델로 저축은행 관련성 1차 판정
                 → irrelevant 판정 시 [7] 건너뛰고 relevance='irrelevant'로 저장 종료
[7] analyze     AI Gateway 통해 구조화 분석(F-02) → JSON 스키마 검증 → analyses insert
[8] embed       분석 결과를 청크로 임베딩 → article_embeddings insert
[9] purge       raw_content 보존기간(7일) 경과 건 배치로 NULL 처리 (스케줄 잡, 개별 기사 트리거 아님)
```

**설계 원칙**
- **단계 격리**: 한 출처/한 기사의 실패가 다른 처리를 막지 않는다. BullMQ 큐별로 동시성(concurrency)과 재시도 정책을 독립 설정한다.
- **멱등성**: `url_hash` UNIQUE 제약([3] dedupe)과 `(article_id, is_current)` 조건([7] analyze 재실행)으로 같은 잡이 중복 실행돼도 데이터가 중복 생성되지 않는다.
- **재시도**: 지수 백오프 최대 3회 → 실패 시 BullMQ DLQ(failed 큐)로 이동, `crawl_logs`/`ai_call_logs`에 에러 기록, `pipeline_stage='failed'`.
- **비용 최적화**: [6] prefilter가 전체 기사의 60~70%를 걸러내도록 설계(§5.2 요구사항). [5] cluster에서 대표 기사만 [7] analyze를 수행해 중복 분석을 방지한다(F-11).

## 4. AI Gateway

`src/server/ai/gateway.ts`는 애플리케이션에서 LLM을 호출하는 유일한 경로다(ADR-007).
애플리케이션 코드(서비스 레이어, 파이프라인 잡)는 provider SDK를 직접 import하지 않는다.

책임 범위:
1. 작업 유형(`analyze`/`briefing`/`qa`/`classify`/`nl_search`) → `ai_models` 테이블에서 활성 모델·우선순위 조회
2. `prompt_versions`에서 활성 프롬프트 로드 + 변수 치환(카테고리 목록, 오늘 날짜 등 동적 값 주입)
3. 외부 텍스트(기사 본문, 사용자 질문)를 `<article>`/`<question>` 구분자로 감싸고 인젝션 패턴 로그(§20-3)
4. 응답 JSON을 zod 스키마로 검증 → 실패 시 1회 재시도 → 최종 실패 시 `analysis_status='failed'`
5. 1순위 모델 실패/타임아웃 시 `ai_models.priority` 기준 폴백 모델로 재시도
6. 모든 호출의 토큰/비용/지연시간을 `ai_call_logs`에 기록
7. 레이트리밋(사용자당 AI 질의응답 20회/시간 등, §16.3) 및 일일 비용 예산 초과 시 자동 차단(F-10)

## 5. 프론트엔드 구조

- 서버 컴포넌트 기본, 상호작용 필요한 곳만 `'use client'`(§11.2).
- 데이터 페칭은 `features/*/hooks`에 모으고 `components/`는 순수 렌더링만 담당.
- 라우트는 §4.1 라우트 맵을 그대로 따른다.

## 6. 외부 통신 지점 (방화벽/보안심사 대상 — §15.4)

온프레미스 이전 시 방화벽 신청에 필요한 외부 통신 목록이다. 신규 출처/provider 추가 시 이 표를 갱신한다.

| 목적 | 대상 | 방향 | 프로토콜 |
|---|---|---|---|
| 뉴스 수집 | 금융위/금감원/한국은행/예보/금결원 사이트 및 RSS | outbound | HTTPS |
| 뉴스 수집 | 언론사 RSS(연합뉴스, 매경, 한경, 전자신문, 디지털타임스 등) | outbound | HTTPS |
| AI 분석/브리핑/QA/임베딩 | Anthropic API (기본), OpenAI API (대체) | outbound | HTTPS |
| 이메일 브리핑 발송 (옵션) | 사내 SMTP 서버 | outbound | SMTP(S) |
| 사용자 접근 | 사내망 클라이언트 → web | inbound | HTTPS |

모든 outbound 대상은 하드코딩하지 않고 `sources`/`ai_models` 테이블 또는 환경변수로 관리한다(§21 개발 원칙).
프록시(`HTTP_PROXY`/`HTTPS_PROXY`) 환경변수를 모든 outbound 클라이언트(수집기, AI Gateway)가 지원해야 한다.

## 7. 캐싱 전략 (§17.3)

| 대상 | TTL | 무효화 |
|---|---|---|
| 오늘의 브리핑 | 24시간 | 관리자 수동 재생성 시 즉시 |
| 대시보드 통계 | 10분 | - |
| 카테고리 목록 | 1시간 | 관리자가 카테고리 수정 시 즉시 |
| 뉴스 목록 첫 페이지 | 5분 | 신규 기사 analyze 완료 시 |

캐시 키에 스키마/버전 접두어(`v1:briefing:2026-08-03`)를 붙여 배포 시 무효화를 단순화한다(§17.1).

## 8. 온프레미스 이전 대비 (§15.4)

- 관리형 클라우드 전용 서비스(서버리스 DB, 벤더 종속 큐)를 사용하지 않는다 — Postgres/Redis는 표준 오픈소스로 어디서든 동일하게 배포된다.
- 모든 시크릿·엔드포인트는 환경변수로 주입(`.env`), 코드에 하드코딩 금지.
- §6의 외부 통신 지점 목록을 최신 상태로 유지 — 보안심사 신청 시 그대로 제출 가능하도록.

## 9. 확장 대비 (지금 구조가 막지 않는 것들, §17.2)

| 미래 요구 | 지금 확보해 둔 것 |
|---|---|
| 내부 문서 통합 검색 | `article_embeddings.source_type`으로 문서 유형 구분 가능 |
| 온프레미스 LLM | AI Gateway provider 인터페이스(ADR-007) |
| 영문 기사 | `articles.language` 컬럼, 프롬프트 언어 변수화 |
| 다른 업권으로 복제 | "저축은행 관점"은 프롬프트 변수로 분리, 하드코딩 없음 |
| 멀티테넌시(회원사 확대) | 전 테이블 `org_id` 컬럼 기본값으로 미리 확보 |
| 모바일 앱 | UI와 API 분리(Route Handlers가 곧 공개 가능한 API 형태) |

## 10. 폴더 구조

§10(PROJECT_SPEC) 구조를 그대로 채택한다. 유일한 변경점은 ADR-001에 따라
`services/worker/`(별도 언어 가정) 대신 `src/server/worker/`(Node.js 진입점)를 사용하는 것이다.
