import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — the app cannot reach the database.");
  }

  // Prisma 7 connects through a driver adapter rather than a `url` in
  // schema.prisma, so the connection string is supplied here.
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function client(): PrismaClient {
  // One client per process, reused across dev hot reloads — otherwise every
  // reload opens another connection pool until Postgres refuses connections.
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * Lazily constructed Prisma client.
 *
 * The construction is deferred behind a Proxy because `next build` imports every
 * route module to collect its metadata, and DATABASE_URL is deliberately absent
 * during the Docker image build. Constructing eagerly fails the build; this way
 * the connection is only made when a query actually runs, and a genuinely
 * missing DATABASE_URL still raises a clear error at request time.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const value = Reflect.get(client(), property, receiver);
    // Methods must stay bound to the real client, not the proxy.
    return typeof value === "function" ? value.bind(client()) : value;
  },
  has(_target, property) {
    return property in client();
  },
});
