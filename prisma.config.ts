import type { PrismaConfig } from "prisma";

const databaseUrl = process.env.DATABASE_URL ?? "file:./prisma/sqlite.db";

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  }
} satisfies PrismaConfig;
