/**
 * Seeds the admin-console demo accounts referenced by src/context/admin-auth-context.tsx's
 * DEMO_ADMINS map and the "빠른 데모 로그인" buttons on /admin/login. Those buttons fill in
 * password "demo1234" — this script must keep matching that literal.
 *
 * ⚠ 프로덕션 배포 파이프라인(`npm run build`)에는 절대 넣지 않는다 — upsert의 update
 * 절이 매번 name/role/isActive/passwordHash를 하드코딩된 데모 비밀번호로 되돌리므로,
 * 자동 실행하면 실제 운영자가 바꾼 비밀번호를 배포할 때마다 "demo1234"로 리셋해버린다
 * (2026-08 프로덕션 준비 점검에서 발견). 최초 배포 직후 한 번만 수동으로
 * `npm run db:seed:admins`(운영 DATABASE_URL 대상)로 실행해 초기 관리자 계정을 만드는
 * 용도로만 쓴다.
 */
import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BCRYPT_COST_FACTOR } from "@/server/auth/constants";

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_PASSWORD = "demo1234";

const DEMO_ADMINS: { email: string; name: string; role: UserRole }[] = [
  { email: "admin@sbfederation.or.kr", name: "김관리", role: "admin" },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST_FACTOR);

  for (const admin of DEMO_ADMINS) {
    await prisma.user.upsert({
      where: { orgId_email: { orgId: DEFAULT_ORG_ID, email: admin.email } },
      update: { name: admin.name, role: admin.role, isActive: true, passwordHash },
      create: {
        orgId: DEFAULT_ORG_ID,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        isActive: true,
        passwordHash,
      },
    });
  }

  console.log(`✔ admin demo accounts: ${DEMO_ADMINS.length}개 (password: ${DEMO_PASSWORD})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
