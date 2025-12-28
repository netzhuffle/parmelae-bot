import type { PrismaConfig } from "prisma";

export default {
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: "file:./prisma/sqlite.db",
  }
} satisfies PrismaConfig;
