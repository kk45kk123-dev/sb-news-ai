-- 감정분석(sentiment) 기능 제거: Analysis.sbImpactDirection 컬럼과 그 값을 담던
-- impact_direction enum을 완전히 삭제한다. sb_impact_score/sb_impact_reason은
-- 별개 필드로 그대로 유지된다.
ALTER TABLE "analyses" DROP COLUMN "sb_impact_direction";
DROP TYPE "impact_direction";

-- 관리 콘솔 역할 체계를 admin 단일 등급으로 축소: user_role에서 editor를 제거한다.
-- 기존에 editor로 시딩된 계정은 이제 admin 권한이 없는 일반 사용자와 동일하게
-- viewer로 재배정한다 (관리 콘솔 접근은 admin.role === "admin"만 허용, 앱 레이어에서 강제).
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE TEXT USING "role"::TEXT;
UPDATE "users" SET "role" = 'viewer' WHERE "role" = 'editor';
DROP TYPE "user_role";
CREATE TYPE "user_role" AS ENUM ('admin', 'viewer');
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role" USING "role"::"user_role";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'viewer'::"user_role";
