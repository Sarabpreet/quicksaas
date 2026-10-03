import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import * as schema from "./schema/index.js";

const dbUrl = process.env.DATABASE_URL;

let dbInstance: any;
let rawClient: any;

function initClient() {
  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    console.log("[DB] Connecting to external PostgreSQL at", dbUrl.replace(/:[^:@]*@/, ":***@"));
    rawClient = postgres(dbUrl);
    dbInstance = drizzlePostgres(rawClient, { schema });
  } else {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    const backendRoot = path.resolve(currentDir, "../..");
    const dataDir = process.env.DATA_DIR || path.resolve(backendRoot, ".data", "postgres");
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    } else {
      const pidFile = path.join(dataDir, "postmaster.pid");
      if (fs.existsSync(pidFile)) {
        try {
          fs.unlinkSync(pidFile);
        } catch {}
      }
    }
    console.log(`[DB] Using embedded PostgreSQL (PGlite) storing at: ${dataDir}`);
    rawClient = new PGlite(dataDir);
    dbInstance = drizzlePglite(rawClient, { schema });
  }
}

initClient();

export async function reloadDatabaseClient() {
  if (rawClient) {
    try {
      if (typeof rawClient.close === "function" && !rawClient.closed) {
        await rawClient.close();
      } else if (typeof rawClient.end === "function") {
        await rawClient.end();
      }
    } catch (e) {
      console.warn("[DB] Error closing previous DB client during reload:", e);
    }
  }
  initClient();
  return dbInstance;
}

export const db: any = new Proxy({} as any, {
  get(_target, prop) {
    return dbInstance[prop];
  },
});

export { rawClient };
export type Database = typeof dbInstance;
