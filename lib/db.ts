import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

function createPrismaClient() {
    // Usa a mesma fonte de verdade do prisma.config.ts (DATABASE_URL),
    // com fallback para o banco local de desenvolvimento.
    const url = process.env.DATABASE_URL ?? "file:./dev.db";
    const adapter = new PrismaBetterSqlite3({ url });
    return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;