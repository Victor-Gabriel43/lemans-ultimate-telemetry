import { PrismaClient } from "@prisma/client";

// Singleton simples — em dev com `tsx watch`, o módulo é recarregado a cada
// mudança de arquivo, então guardamos a instância em globalThis pra não abrir
// uma conexão nova do SQLite a cada hot-reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
