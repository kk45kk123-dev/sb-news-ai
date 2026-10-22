-- CreateEnum
CREATE TYPE "event_importance" AS ENUM ('high', 'medium', 'low');

-- CreateTable
CREATE TABLE "economic_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "org_id" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "event_date" DATE NOT NULL,
    "event_time" VARCHAR(20),
    "importance" "event_importance" NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "economic_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_economic_events_org_date" ON "economic_events"("org_id", "event_date");

-- AddForeignKey
ALTER TABLE "economic_events" ADD CONSTRAINT "economic_events_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
