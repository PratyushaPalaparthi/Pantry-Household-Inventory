import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * Prisma 7 no longer reads the connection URL from schema.prisma. The CLI
 * (`prisma migrate`, `prisma studio`) gets it from here; the application client
 * gets it from the driver adapter in src/lib/prisma.ts.
 *
 * `dotenv/config` is imported explicitly because the Prisma 7 CLI no longer
 * auto-loads .env.
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
