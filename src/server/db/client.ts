import { PrismaClient } from "@prisma/client";

// Next.js 개발 모드 HMR 시 커넥션이 계속 생성되는 것을 막기 위한 표준 싱글톤 패턴.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
