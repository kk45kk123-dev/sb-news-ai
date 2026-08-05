/**
 * Seeds the admin-console demo accounts referenced by src/context/admin-auth-context.tsx's
 * DEMO_ADMINS map and the "빠른 데모 로그인" buttons on /admin/login. Those buttons fill in
 * password "demo1234" — this script must keep matching that literal.
 *
 * Idempotent (upsert by org+email) — safe to re-run after redeploys.
 */
import { PrismaClient, type UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BCRYPT_COST_FACTOR } from "@/server/auth/constants";

const prisma = new PrismaClient();
const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const DEMO_PASSWORD = "demo1234";

const DEMO_ADMINS: { email: string; name: string; role: UserRole }[] = [
  { email: "admin@sbfederation.or.kr", name: "김관리", role: "admin" },
  { email: "editor@sbfederation.or.kr", name: "박편집", role: "editor" },
  { email: "viewer@sbfederation.or.kr", name: "이열람", role: "viewer" },
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
