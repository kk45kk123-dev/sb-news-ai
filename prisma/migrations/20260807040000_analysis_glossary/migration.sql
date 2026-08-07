-- 기사별 AI 자동 용어사전(glossary) — annotate()가 기존 정적 사전(src/lib/terms.ts)에
-- 이 기사 전용 용어를 더해서 본문/요약에 툴팁을 붙인다.
ALTER TABLE "analyses" ADD COLUMN "glossary" JSONB NOT NULL DEFAULT '[]';
