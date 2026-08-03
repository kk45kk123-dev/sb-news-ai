# DB_SCHEMA.md — 데이터베이스 스키마

PostgreSQL 15+, 확장: `pgcrypto`(UUID), `pgvector`(임베딩), `pg_bigm`(한국어 부분일치 검색, ADR-002).
ORM: Prisma — 아래 DDL은 논리 설계 확정용이며 실제 마이그레이션은 Prisma schema로 변환해 관리한다.

멀티테넌시 대비(§17.1): 향후 회원 저축은행사 확대를 대비해 핵심 테이블에 `org_id`를 미리 넣는다.
MVP는 단일 조직(중앙회)만 운영하므로 모든 행이 기본 조직 UUID를 갖는다. `organizations` 테이블은
Phase 1에서는 시드 1행만 존재하는 최소 형태로 둔다.

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_bigm;

CREATE TABLE organizations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        varchar(200) NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
-- 시드: 저축은행중앙회 1행. 모든 org_id 컬럼의 기본값으로 사용.
```

## 1. Enum 타입

```sql
CREATE TYPE user_role            AS ENUM ('admin','editor','viewer');
CREATE TYPE source_type          AS ENUM ('rss','api','scrape');
CREATE TYPE source_status        AS ENUM ('ok','error','needs_review');
CREATE TYPE pipeline_stage       AS ENUM (
  'collected','normalized','enriched','clustered',
  'prefiltered','analyzed','embedded','failed');
CREATE TYPE relevance_type       AS ENUM ('relevant','irrelevant','unknown');
CREATE TYPE impact_direction     AS ENUM ('positive','negative','neutral','mixed');
CREATE TYPE confidence_level     AS ENUM ('high','medium','low');
CREATE TYPE assigned_by_type     AS ENUM ('ai','human');
CREATE TYPE generated_by_type    AS ENUM ('auto','manual');
CREATE TYPE chunk_type           AS ENUM ('analysis','content_section');
CREATE TYPE feedback_rating      AS ENUM ('up','down');
CREATE TYPE ai_task_type         AS ENUM ('analyze','briefing','qa','classify','nl_search','embed');
CREATE TYPE watch_match_type     AS ENUM ('exact','fuzzy');
CREATE TYPE notify_channel       AS ENUM ('email','in_app');
CREATE TYPE feedback_type        AS ENUM ('inaccurate','irrelevant','good');
CREATE TYPE feedback_status      AS ENUM ('open','reviewed','resolved');
CREATE TYPE chat_role            AS ENUM ('user','assistant');
```

## 2. 핵심 테이블

### `users`

```sql
CREATE TABLE users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id),
  email           varchar(255) NOT NULL,
  name            varchar(100) NOT NULL,
  department      varchar(100),
  role            user_role NOT NULL DEFAULT 'viewer',
  password_hash   varchar(255),          -- SSO 도입 시 nullable 유지
  is_active       boolean NOT NULL DEFAULT true,
  last_login_at   timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, email)
);
```
- `UNIQUE(org_id, email)`: 로그인 조회의 유일 경로. 멀티테넌시 확장 시 조직별 이메일 유니크로 확장 가능하게 org_id 포함.

### `sources`

```sql
CREATE TABLE sources (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                uuid NOT NULL REFERENCES organizations(id),
  name                  varchar(200) NOT NULL,
  type                  source_type NOT NULL,
  url                   text NOT NULL,
  config                jsonb NOT NULL DEFAULT '{}',   -- 스크래핑 셀렉터, API 파라미터
  category_hints        text[] NOT NULL DEFAULT '{}',
  credibility           smallint NOT NULL DEFAULT 3 CHECK (credibility BETWEEN 1 AND 5),
  fetch_interval_min    int NOT NULL DEFAULT 30,
  is_active             boolean NOT NULL DEFAULT true,
  status                source_status NOT NULL DEFAULT 'needs_review',
  consecutive_failures  int NOT NULL DEFAULT 0,
  last_fetched_at       timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_sources_active_due ON sources (is_active, last_fetched_at)
  WHERE is_active = true;
```
- 부분 인덱스 `idx_sources_active_due`: 스케줄러가 "활성 + 마지막 수집이 오래된" 출처를 매 틱마다 스캔하므로, 비활성 출처를 인덱스에서 제외해 스캔 비용을 줄인다.

### `articles`

```sql
CREATE TABLE articles (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organizations(id),
  source_id           uuid NOT NULL REFERENCES sources(id),
  url                 text NOT NULL,
  url_hash            varchar(64) NOT NULL,     -- sha256(정규화된 URL)
  title               text NOT NULL,
  description         text,
  raw_content         text,                     -- 분석용 임시 저장 (§20-1)
  content_purged_at   timestamptz,
  author              varchar(200),
  publisher           varchar(200),
  published_at        timestamptz NOT NULL,
  image_url           text,
  is_paywalled        boolean NOT NULL DEFAULT false,
  language             varchar(10) NOT NULL DEFAULT 'ko',   -- §17.2 영문 기사 대비
  cluster_id          uuid,
  is_cluster_lead     boolean NOT NULL DEFAULT true,
  pipeline_stage      pipeline_stage NOT NULL DEFAULT 'collected',
  relevance           relevance_type NOT NULL DEFAULT 'unknown',
  collected_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (url_hash)
);

CREATE INDEX idx_articles_published_at   ON articles (published_at DESC);
CREATE INDEX idx_articles_cluster        ON articles (cluster_id) WHERE cluster_id IS NOT NULL;
CREATE INDEX idx_articles_pipeline_stage ON articles (pipeline_stage)
  WHERE pipeline_stage NOT IN ('embedded','failed');
CREATE INDEX idx_articles_purge_due      ON articles (published_at)
  WHERE raw_content IS NOT NULL;

-- 한국어 부분일치 검색 (pg_bigm)
CREATE INDEX idx_articles_title_bigm ON articles USING gin (title gin_bigm_ops);
CREATE INDEX idx_articles_desc_bigm  ON articles USING gin (description gin_bigm_ops);
```
- `url_hash UNIQUE`: F-01 수용 기준 "URL 정규화 후 해시로 중복 방지"를 DB 제약으로 강제 — 애플리케이션 버그로도 중복이 생기지 않도록.
- `idx_articles_pipeline_stage`: 부분 인덱스로 "아직 처리 중인" 기사만 인덱싱 — 파이프라인 잡이 "다음 처리할 기사"를 조회할 때 사용. 완료/실패 기사는 스캔 대상에서 제외해 인덱스 크기를 억제한다.
- `idx_articles_purge_due`: [9] purge 배치가 "raw_content가 아직 남아있고 7일 지난" 기사를 조회할 때 사용.
- 모든 목록 쿼리는 `published_at` 범위 필터를 강제해(§17.1) 향후 월별 파티셔닝 전환 시 쿼리 패턴 변경이 최소화되도록 한다.

### `analyses`

```sql
CREATE TABLE analyses (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id            uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  summary_lines         text[] NOT NULL,        -- 정확히 3개, 애플리케이션에서 검증
  keywords              text[] NOT NULL,
  importance            smallint NOT NULL CHECK (importance BETWEEN 1 AND 5),
  sb_impact_score       smallint NOT NULL CHECK (sb_impact_score BETWEEN 1 AND 5),
  sb_impact_direction   impact_direction NOT NULL,
  sb_impact_reason      text NOT NULL,
  customer_impact       text,
  digital_impact        text,
  risks                 text[] NOT NULL DEFAULT '{}',
  action_ideas          text[] NOT NULL DEFAULT '{}',
  ai_comment            text,
  evidence              jsonb NOT NULL DEFAULT '[]',   -- [{quote, source: 'title'|'description'}]
  confidence            confidence_level NOT NULL,
  prompt_version_id     uuid NOT NULL REFERENCES prompt_versions(id),
  model_id              uuid NOT NULL REFERENCES ai_models(id),
  token_input           int,
  token_output          int,
  latency_ms            int,
  is_current            boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_analyses_current ON analyses (article_id) WHERE is_current = true;
CREATE INDEX idx_analyses_impact ON analyses (sb_impact_score DESC) WHERE is_current = true;
```
- `uq_analyses_current`: "기사당 현재 버전은 1개"라는 F-02 수용 기준(이력 관리)을 부분 유니크 인덱스로 강제. 재분석 시 애플리케이션이 이전 행의 `is_current`를 `false`로 바꾼 뒤 새 행을 insert하는 트랜잭션으로 처리.
- `idx_analyses_impact`: 브리핑 TOP5 후보 조회(F-03, sb_impact_score 우선 정렬)에 직접 사용.

### `categories` / `article_categories`

```sql
CREATE TABLE categories (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES organizations(id),
  name        varchar(50) NOT NULL,
  slug        varchar(50) NOT NULL,
  is_active   boolean NOT NULL DEFAULT true,
  sort_order  int NOT NULL DEFAULT 0,
  UNIQUE (org_id, slug)
);
-- 시드: 정책/금리/대출·여신/PF·부동산/핀테크/AI/사이버보안/ESG/규제·감독/디지털전환/건전성·리스크/업계동향/기타

CREATE TABLE article_categories (
  article_id    uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  category_id   uuid NOT NULL REFERENCES categories(id),
  rank          smallint NOT NULL CHECK (rank BETWEEN 1 AND 3),
  assigned_by   assigned_by_type NOT NULL DEFAULT 'ai',
  PRIMARY KEY (article_id, category_id)
);
CREATE INDEX idx_article_categories_category ON article_categories (category_id, rank);
```

### `briefings`

```sql
CREATE TABLE briefings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL REFERENCES organizations(id),
  briefing_date       date NOT NULL,
  overview            text NOT NULL,
  items               jsonb NOT NULL,     -- [{article_id, rank, why_now, so_what}]
  follow_ups          text[] NOT NULL DEFAULT '{}',
  model_id            uuid REFERENCES ai_models(id),
  prompt_version_id   uuid REFERENCES prompt_versions(id),
  generated_at        timestamptz NOT NULL DEFAULT now(),
  generated_by        generated_by_type NOT NULL DEFAULT 'auto',
  UNIQUE (org_id, briefing_date)
);
```
- 브리핑은 불변(F-03 수용 기준) — UPDATE 대신 관리자 수동 재생성 시 새 행을 만들고 이전 행은 `generated_by`/시각으로 구분해 이력 보존(단순화를 위해 MVP는 최신 1건만 유지하고 재생성 시 upsert, 이력이 필요해지면 별도 `briefing_versions`로 분리 — DECISIONS에 후속 ADR 필요 시 기록).

### `article_embeddings`

```sql
CREATE TABLE article_embeddings (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id   uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  chunk_type   chunk_type NOT NULL,
  source_type  varchar(30) NOT NULL DEFAULT 'news',  -- §17.2: 향후 내부문서 통합 대비
  chunk_text   text NOT NULL,           -- AI 생성 분석 텍스트만. 원문 저장 금지 (§20-1)
  embedding    vector(1536) NOT NULL,   -- 차원은 채택 임베딩 모델에 맞춰 조정
  model        varchar(100) NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_article_embeddings_vec ON article_embeddings
  USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_article_embeddings_article ON article_embeddings (article_id);
```
- HNSW를 IVFFlat 대신 채택: 이 규모(연 수만 건)에서는 빌드 시간이 짧고 삽입이 잦은 워크로드(매 시간 신규 임베딩 추가)에 IVFFlat보다 적합(재클러스터링 불필요).

### `user_article_states`

```sql
CREATE TABLE user_article_states (
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  article_id      uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  is_read         boolean NOT NULL DEFAULT false,
  read_at         timestamptz,
  is_bookmarked   boolean NOT NULL DEFAULT false,
  bookmarked_at   timestamptz,
  memo            text,
  folder          varchar(100),
  rating          feedback_rating,
  PRIMARY KEY (user_id, article_id)
);
CREATE INDEX idx_uas_bookmarked ON user_article_states (user_id, bookmarked_at DESC)
  WHERE is_bookmarked = true;
CREATE INDEX idx_uas_unread ON user_article_states (user_id) WHERE is_read = false;
```

### `prompts` / `prompt_versions`

```sql
CREATE TABLE prompts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type    ai_task_type NOT NULL,
  name         varchar(100) NOT NULL,
  description  text,
  UNIQUE (task_type, name)
);

CREATE TABLE prompt_versions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt_id         uuid NOT NULL REFERENCES prompts(id),
  version           int NOT NULL,
  system_prompt     text NOT NULL,
  user_template     text NOT NULL,
  variables         jsonb NOT NULL DEFAULT '{}',
  output_schema     jsonb NOT NULL,
  is_active         boolean NOT NULL DEFAULT false,
  created_by        uuid REFERENCES users(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  notes             text,
  UNIQUE (prompt_id, version)
);
-- "task_type당 활성 버전 1개"는 애플리케이션 트랜잭션(활성화 시 같은 prompt의 기존 활성 버전을 비활성화)으로 강제.
CREATE UNIQUE INDEX uq_prompt_versions_active ON prompt_versions (prompt_id) WHERE is_active = true;
```

### `ai_models`

```sql
CREATE TABLE ai_models (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider              varchar(50) NOT NULL,     -- 'anthropic' | 'openai' | ...
  model_key             varchar(100) NOT NULL,    -- 실제 API 모델 식별자
  display_name          varchar(100) NOT NULL,
  task_types            ai_task_type[] NOT NULL,
  params                jsonb NOT NULL DEFAULT '{}',   -- temperature 등
  cost_per_1k_input     numeric(10,6) NOT NULL DEFAULT 0,
  cost_per_1k_output    numeric(10,6) NOT NULL DEFAULT 0,
  priority              int NOT NULL DEFAULT 1,   -- 낮을수록 우선 (폴백 순서)
  is_active             boolean NOT NULL DEFAULT true
);
```
- API 키는 이 테이블에 저장하지 않는다(§16.2). `provider`별 API 키는 환경변수에서 조회한다.

### `chat_sessions` / `chat_messages`

```sql
CREATE TABLE chat_sessions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id       uuid NOT NULL REFERENCES organizations(id),
  user_id      uuid NOT NULL REFERENCES users(id),
  title        varchar(200),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_sessions_user ON chat_sessions (user_id, updated_at DESC);

CREATE TABLE chat_messages (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id               uuid NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role                     chat_role NOT NULL,
  content                  text NOT NULL,
  referenced_article_ids   uuid[] NOT NULL DEFAULT '{}',
  retrieval_query          jsonb,
  token_input              int,
  token_output             int,
  created_at               timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_chat_messages_session ON chat_messages (session_id, created_at);
```

### `keyword_watches` / `notifications`

```sql
CREATE TABLE keyword_watches (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  keyword      varchar(100) NOT NULL,
  match_type   watch_match_type NOT NULL DEFAULT 'fuzzy',
  min_impact   smallint CHECK (min_impact BETWEEN 1 AND 5),
  channel      notify_channel NOT NULL DEFAULT 'in_app',
  is_active    boolean NOT NULL DEFAULT true
);
CREATE INDEX idx_keyword_watches_active ON keyword_watches (is_active) WHERE is_active = true;

CREATE TABLE notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         varchar(50) NOT NULL,
  title        varchar(200) NOT NULL,
  body         text,
  link         text,
  is_read      boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id, created_at DESC)
  WHERE is_read = false;
```

### 로그·감사 테이블

```sql
CREATE TABLE crawl_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id      uuid NOT NULL REFERENCES sources(id),
  started_at     timestamptz NOT NULL,
  finished_at    timestamptz,
  status         varchar(20) NOT NULL,   -- 'success' | 'error' | 'partial'
  items_found    int NOT NULL DEFAULT 0,
  items_new      int NOT NULL DEFAULT 0,
  error_message  text
);
CREATE INDEX idx_crawl_logs_source_time ON crawl_logs (source_id, started_at DESC);

CREATE TABLE ai_call_logs (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type          ai_task_type NOT NULL,
  model_id           uuid REFERENCES ai_models(id),
  prompt_version_id  uuid REFERENCES prompt_versions(id),
  article_id         uuid REFERENCES articles(id),
  token_input        int,
  token_output       int,
  cost               numeric(10,6),
  latency_ms         int,
  status             varchar(20) NOT NULL,   -- 'success' | 'error' | 'timeout'
  error              text,
  created_at         timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ai_call_logs_created ON ai_call_logs (created_at DESC);
CREATE INDEX idx_ai_call_logs_task ON ai_call_logs (task_type, created_at DESC);

-- 감사 로그: append-only. UPDATE/DELETE 권한을 애플리케이션 DB 사용자에게서 REVOKE.
CREATE TABLE audit_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id),
  user_id       uuid REFERENCES users(id),
  action        varchar(100) NOT NULL,    -- 'login' | 'admin.source.update' | ...
  target_type   varchar(50),
  target_id     uuid,
  before        jsonb,
  after         jsonb,
  ip_address    inet,
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_logs_user_time ON audit_logs (user_id, created_at DESC);
CREATE INDEX idx_audit_logs_target ON audit_logs (target_type, target_id);
```
- `audit_logs`는 5년 보존, 변조 방지(§16.5). DB 레벨에서 애플리케이션 계정의 `UPDATE`/`DELETE` 권한을 제거해 "관리자도 임의 삭제 불가"(§20-4)를 코드가 아니라 DB 권한으로 강제한다:
```sql
REVOKE UPDATE, DELETE ON audit_logs FROM app_user;
```

### `feedbacks` / `golden_set`

```sql
CREATE TABLE feedbacks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES users(id),
  analysis_id   uuid NOT NULL REFERENCES analyses(id),
  type          feedback_type NOT NULL,
  comment       text,
  status        feedback_status NOT NULL DEFAULT 'open',
  reviewed_by   uuid REFERENCES users(id),
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_feedbacks_status ON feedbacks (status, created_at);

CREATE TABLE golden_set (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id       uuid NOT NULL REFERENCES articles(id),
  expected_output  jsonb NOT NULL,
  notes            text,
  created_by       uuid REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

## 3. 데이터 보존 정책 구현 (§8.2)

| 데이터 | 보존 | 구현 |
|---|---|---|
| `articles.raw_content` | 7일 | worker 스케줄 잡(`purge.job.ts`)이 매일 실행, `idx_articles_purge_due` 사용해 대상 조회 후 `raw_content=NULL, content_purged_at=now()` |
| `ai_call_logs` | 1년 → 이후 월별 집계 | 월별 배치가 1년 초과 행을 `ai_call_logs_monthly_agg`로 집계 후 원본 삭제 (V1에서 구현) |
| `audit_logs` | 5년, 삭제 불가 | DB 권한으로 UPDATE/DELETE 차단, 보존기간 경과 후 별도 아카이브 프로세스만 이동 가능 (애플리케이션에서 삭제 경로 없음) |
| `chat_messages` | 1년, 사용자 요청 시 개별 삭제 | 개별 삭제 API는 허용(`DELETE /me/chat-sessions/:id`), 자동 배치는 1년 초과분 삭제 |

## 4. 인덱스 전략 요약

- 모든 목록 조회는 `published_at`/`created_at` 기준 정렬 + 범위 필터를 강제 → 파티셔닝 전환(§17.1) 시 쿼리 재작성 최소화.
- "현재 유효한 행만" 조회하는 패턴(활성 분석, 활성 프롬프트, 활성 출처)은 부분 인덱스(`WHERE is_current/is_active`)로 인덱스 크기를 억제.
- 검색은 `pg_bigm` GIN 인덱스(제목/설명), 벡터 검색은 `pgvector` HNSW 인덱스로 분리 — F-07의 하이브리드 검색(BM25 유사 키워드 + 벡터, RRF 결합)이 두 인덱스를 병렬 조회 후 애플리케이션 레벨에서 결합한다.
