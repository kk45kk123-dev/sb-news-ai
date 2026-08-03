-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_bigm";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'editor', 'viewer');

-- CreateEnum
CREATE TYPE "source_type" AS ENUM ('rss', 'api', 'scrape');

-- CreateEnum
CREATE TYPE "source_status" AS ENUM ('ok', 'error', 'needs_review');

-- CreateEnum
CREATE TYPE "pipeline_stage" AS ENUM ('collected', 'normalized', 'enriched', 'clustered', 'prefiltered', 'analyzed', 'embedded', 'failed');

-- CreateEnum
CREATE TYPE "relevance_type" AS ENUM ('relevant', 'irrelevant', 'unknown');

-- CreateEnum
CREATE TYPE "impact_direction" AS ENUM ('positive', 'negative', 'neutral', 'mixed');

-- CreateEnum
CREATE TYPE "confidence_level" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "assigned_by_type" AS ENUM ('ai', 'human');

-- CreateEnum
CREATE TYPE "generated_by_type" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "chunk_type" AS ENUM ('analysis', 'content_section');

-- CreateEnum
CREATE TYPE "feedback_rating" AS ENUM ('up', 'down');

-- CreateEnum
CREATE TYPE "ai_task_type" AS ENUM ('analyze', 'briefing', 'qa', 'classify', 'nl_search', 'embed');

-- CreateEnum
CREATE TYPE "watch_match_type" AS ENUM ('exact', 'fuzzy');

-- CreateEnum
CREATE TYPE "notify_channel" AS ENUM ('email', 'in_app');

-- CreateEnum
CREATE TYPE "feedback_type" AS ENUM ('inaccurate', 'irrelevant', 'good');

-- CreateEnum
CREATE TYPE "feedback_status" AS ENUM ('open', 'reviewed', 'resolved');

-- CreateEnum
CREATE TYPE "chat_role" AS ENUM ('user', 'assistant');

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(200) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "department" VARCHAR(100),
    "role" "user_role" NOT NULL DEFAULT 'viewer',
    "password_hash" VARCHAR(255),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "source_type" NOT NULL,
    "url" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "category_hints" TEXT[],
    "credibility" SMALLINT NOT NULL DEFAULT 3,
    "fetch_interval_min" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "status" "source_status" NOT NULL DEFAULT 'needs_review',
    "consecutive_failures" INTEGER NOT NULL DEFAULT 0,
    "last_fetched_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "url_hash" VARCHAR(64) NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "raw_content" TEXT,
    "content_purged_at" TIMESTAMPTZ,
    "author" VARCHAR(200),
    "publisher" VARCHAR(200),
    "published_at" TIMESTAMPTZ NOT NULL,
    "image_url" TEXT,
    "is_paywalled" BOOLEAN NOT NULL DEFAULT false,
    "language" VARCHAR(10) NOT NULL DEFAULT 'ko',
    "cluster_id" UUID,
    "is_cluster_lead" BOOLEAN NOT NULL DEFAULT true,
    "pipeline_stage" "pipeline_stage" NOT NULL DEFAULT 'collected',
    "relevance" "relevance_type" NOT NULL DEFAULT 'unknown',
    "collected_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analyses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "summary_lines" TEXT[],
    "keywords" TEXT[],
    "importance" SMALLINT NOT NULL,
    "sb_impact_score" SMALLINT NOT NULL,
    "sb_impact_direction" "impact_direction" NOT NULL,
    "sb_impact_reason" TEXT NOT NULL,
    "customer_impact" TEXT,
    "digital_impact" TEXT,
    "risks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "action_ideas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ai_comment" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "confidence" "confidence_level" NOT NULL,
    "prompt_version_id" UUID NOT NULL,
    "model_id" UUID NOT NULL,
    "token_input" INTEGER,
    "token_output" INTEGER,
    "latency_ms" INTEGER,
    "is_current" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "slug" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_categories" (
    "article_id" UUID NOT NULL,
    "category_id" UUID NOT NULL,
    "rank" SMALLINT NOT NULL,
    "assigned_by" "assigned_by_type" NOT NULL DEFAULT 'ai',

    CONSTRAINT "article_categories_pkey" PRIMARY KEY ("article_id","category_id")
);

-- CreateTable
CREATE TABLE "briefings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "briefing_date" DATE NOT NULL,
    "overview" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "follow_ups" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "model_id" UUID,
    "prompt_version_id" UUID,
    "generated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" "generated_by_type" NOT NULL DEFAULT 'auto',

    CONSTRAINT "briefings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_embeddings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "chunk_type" "chunk_type" NOT NULL,
    "source_type" VARCHAR(30) NOT NULL DEFAULT 'news',
    "chunk_text" TEXT NOT NULL,
    "embedding" vector(1536) NOT NULL,
    "model" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "article_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_article_states" (
    "user_id" UUID NOT NULL,
    "article_id" UUID NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMPTZ,
    "is_bookmarked" BOOLEAN NOT NULL DEFAULT false,
    "bookmarked_at" TIMESTAMPTZ,
    "memo" TEXT,
    "folder" VARCHAR(100),
    "rating" "feedback_rating",

    CONSTRAINT "user_article_states_pkey" PRIMARY KEY ("user_id","article_id")
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_type" "ai_task_type" NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_versions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "prompt_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "system_prompt" TEXT NOT NULL,
    "user_template" TEXT NOT NULL,
    "variables" JSONB NOT NULL DEFAULT '{}',
    "output_schema" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "prompt_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_models" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" VARCHAR(50) NOT NULL,
    "model_key" VARCHAR(100) NOT NULL,
    "display_name" VARCHAR(100) NOT NULL,
    "task_types" "ai_task_type"[],
    "params" JSONB NOT NULL DEFAULT '{}',
    "cost_per_1k_input" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "cost_per_1k_output" DECIMAL(10,6) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ai_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" VARCHAR(200),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "session_id" UUID NOT NULL,
    "role" "chat_role" NOT NULL,
    "content" TEXT NOT NULL,
    "referenced_article_ids" UUID[],
    "retrieval_query" JSONB,
    "token_input" INTEGER,
    "token_output" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "keyword_watches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "keyword" VARCHAR(100) NOT NULL,
    "match_type" "watch_match_type" NOT NULL DEFAULT 'fuzzy',
    "min_impact" SMALLINT,
    "channel" "notify_channel" NOT NULL DEFAULT 'in_app',
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "keyword_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "type" VARCHAR(50) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "started_at" TIMESTAMPTZ NOT NULL,
    "finished_at" TIMESTAMPTZ,
    "status" VARCHAR(20) NOT NULL,
    "items_found" INTEGER NOT NULL DEFAULT 0,
    "items_new" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,

    CONSTRAINT "crawl_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_call_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_type" "ai_task_type" NOT NULL,
    "model_id" UUID,
    "prompt_version_id" UUID,
    "article_id" UUID,
    "token_input" INTEGER,
    "token_output" INTEGER,
    "cost" DECIMAL(10,6),
    "latency_ms" INTEGER,
    "status" VARCHAR(20) NOT NULL,
    "error" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_call_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "target_type" VARCHAR(50),
    "target_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "analysis_id" UUID NOT NULL,
    "type" "feedback_type" NOT NULL,
    "comment" TEXT,
    "status" "feedback_status" NOT NULL DEFAULT 'open',
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "golden_set" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "article_id" UUID NOT NULL,
    "expected_output" JSONB NOT NULL,
    "notes" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "golden_set_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_org_id_email_key" ON "users"("org_id", "email");

-- CreateIndex
CREATE INDEX "idx_sources_active_due" ON "sources"("is_active", "last_fetched_at") WHERE "is_active" = true;

-- CreateIndex
CREATE UNIQUE INDEX "articles_url_hash_key" ON "articles"("url_hash");

-- CreateIndex
CREATE INDEX "idx_articles_published_at" ON "articles"("published_at" DESC);

-- CreateIndex
CREATE INDEX "idx_articles_cluster" ON "articles"("cluster_id") WHERE "cluster_id" IS NOT NULL;

-- CreateIndex
CREATE INDEX "idx_articles_pipeline_stage" ON "articles"("pipeline_stage") WHERE "pipeline_stage" NOT IN ('embedded', 'failed');

-- CreateIndex
CREATE INDEX "idx_articles_purge_due" ON "articles"("published_at") WHERE "raw_content" IS NOT NULL;

-- CreateIndex
CREATE INDEX "idx_analyses_impact" ON "analyses"("sb_impact_score" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "categories_org_id_slug_key" ON "categories"("org_id", "slug");

-- CreateIndex
CREATE INDEX "idx_article_categories_category" ON "article_categories"("category_id", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "briefings_org_id_briefing_date_key" ON "briefings"("org_id", "briefing_date");

-- CreateIndex
CREATE INDEX "idx_article_embeddings_article" ON "article_embeddings"("article_id");

-- CreateIndex
CREATE INDEX "idx_uas_bookmarked" ON "user_article_states"("user_id", "bookmarked_at" DESC) WHERE "is_bookmarked" = true;

-- CreateIndex
CREATE INDEX "idx_uas_unread" ON "user_article_states"("user_id") WHERE "is_read" = false;

-- CreateIndex
CREATE UNIQUE INDEX "prompts_task_type_name_key" ON "prompts"("task_type", "name");

-- CreateIndex
CREATE UNIQUE INDEX "prompt_versions_prompt_id_version_key" ON "prompt_versions"("prompt_id", "version");

-- CreateIndex
CREATE INDEX "idx_chat_sessions_user" ON "chat_sessions"("user_id", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "idx_chat_messages_session" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_keyword_watches_active" ON "keyword_watches"("is_active") WHERE "is_active" = true;

-- CreateIndex
CREATE INDEX "idx_notifications_user_unread" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_crawl_logs_source_time" ON "crawl_logs"("source_id", "started_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_call_logs_created" ON "ai_call_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ai_call_logs_task" ON "ai_call_logs"("task_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_time" ON "audit_logs"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_target" ON "audit_logs"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "idx_feedbacks_status" ON "feedbacks"("status", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analyses" ADD CONSTRAINT "analyses_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_categories" ADD CONSTRAINT "article_categories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "briefings" ADD CONSTRAINT "briefings_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_embeddings" ADD CONSTRAINT "article_embeddings_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_article_states" ADD CONSTRAINT "user_article_states_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_article_states" ADD CONSTRAINT "user_article_states_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_prompt_id_fkey" FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prompt_versions" ADD CONSTRAINT "prompt_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "keyword_watches" ADD CONSTRAINT "keyword_watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_logs" ADD CONSTRAINT "crawl_logs_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "ai_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_prompt_version_id_fkey" FOREIGN KEY ("prompt_version_id") REFERENCES "prompt_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_call_logs" ADD CONSTRAINT "ai_call_logs_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_analysis_id_fkey" FOREIGN KEY ("analysis_id") REFERENCES "analyses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "golden_set" ADD CONSTRAINT "golden_set_article_id_fkey" FOREIGN KEY ("article_id") REFERENCES "articles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "golden_set" ADD CONSTRAINT "golden_set_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────────
-- Prisma가 표현할 수 없는 부분(docs/DB_SCHEMA.md 참조). 수동으로 추가한다.
-- ─────────────────────────────────────────────────────────────────────

-- Partial unique index: 기사당 현재 유효한 분석은 1개뿐 (F-02 이력 관리 수용 기준)
CREATE UNIQUE INDEX "uq_analyses_current" ON "analyses"("article_id") WHERE "is_current" = true;

-- Partial unique index: task_type당 활성 프롬프트 버전은 1개뿐
CREATE UNIQUE INDEX "uq_prompt_versions_active" ON "prompt_versions"("prompt_id") WHERE "is_active" = true;

-- 한국어 부분일치 검색 (pg_bigm, ADR-002)
CREATE INDEX "idx_articles_title_bigm" ON "articles" USING gin ("title" gin_bigm_ops);
CREATE INDEX "idx_articles_desc_bigm" ON "articles" USING gin ("description" gin_bigm_ops);

-- 벡터 유사도 검색 (pgvector, ADR-003) — 삽입이 잦은 워크로드에 적합한 HNSW 채택
CREATE INDEX "idx_article_embeddings_vec" ON "article_embeddings" USING hnsw ("embedding" vector_cosine_ops);

-- audit_logs는 append-only다 (§16.5, §20-4). 애플리케이션 DB 역할에서 UPDATE/DELETE를 제거한다.
-- 역할명은 배포 환경마다 다르므로(로컬 개발 시 기본 역할만 존재) 존재하지 않는 역할에 대한
-- REVOKE는 조용히 건너뛴다. 운영 배포 시 실제 앱 DB 역할명으로 docs/RUNBOOK.md에 따라 재실행한다.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
    REVOKE UPDATE, DELETE ON "audit_logs" FROM app_user;
  END IF;
END $$;

