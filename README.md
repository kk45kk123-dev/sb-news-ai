# SB News AI

저축은행중앙회 실무자를 위한 "저축은행 관점 뉴스 해석 엔진".

## 현재 상태: Phase 0 (설계)

코드는 아직 없습니다. 먼저 다음 설계 문서를 검토·승인받은 뒤 Phase 1(MVP) 구현을 시작합니다.

- [`docs/PROJECT_SPEC.md`](./docs/PROJECT_SPEC.md) — 요구사항 명세 원문
- [`docs/DECISIONS.md`](./docs/DECISIONS.md) — 기술 선택 ADR
- [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — 시스템 아키텍처
- [`docs/DB_SCHEMA.md`](./docs/DB_SCHEMA.md) — 데이터베이스 스키마(DDL)

## 기술 스택 요약

Next.js(TypeScript, App Router) 단일 저장소 + Node.js Worker, PostgreSQL(pgvector, pg_bigm), Redis(BullMQ),
세션 기반 인증, AI Gateway(Anthropic 기본 / OpenAI 대체 provider 추상화), Docker Compose 배포.
근거는 [`docs/DECISIONS.md`](./docs/DECISIONS.md) 참조.
