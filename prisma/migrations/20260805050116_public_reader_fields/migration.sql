-- NOTE: several indexes Prisma's diff wanted to touch here (idx_article_embeddings_vec,
-- idx_articles_desc_bigm, idx_articles_title_bigm, idx_articles_cluster,
-- idx_articles_pipeline_stage, idx_articles_purge_due, idx_keyword_watches_active,
-- idx_sources_active_due, idx_uas_bookmarked, idx_uas_unread) are partial indexes
-- (WHERE clauses) created via raw SQL in the init migration — Prisma's schema.prisma
-- @@index([...]) DSL can't express partial indexes, so the diff engine sees them as
-- missing/different and wants to drop-or-recreate them as non-partial. Deliberately
-- left untouched here; see prisma/migrations/20260803000000_init/migration.sql.

-- AlterTable
ALTER TABLE "articles" ADD COLUMN     "category_id" VARCHAR(20),
ADD COLUMN     "like_count" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "scheduled_at" TIMESTAMPTZ,
ADD COLUMN     "status" VARCHAR(20) NOT NULL DEFAULT 'published',
ADD COLUMN     "view_count" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "user_article_states" ADD COLUMN     "is_liked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "liked_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "idx_articles_public_list" ON "articles"("org_id", "status", "category_id", "published_at" DESC);
