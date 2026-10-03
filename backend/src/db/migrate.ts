import { migrate as migratePglite } from "drizzle-orm/pglite/migrator";
import { migrate as migratePostgres } from "drizzle-orm/postgres-js/migrator";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./client.js";

export async function runMigrations() {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const migrationsFolder = path.resolve(currentDir, "../../drizzle");
  console.log(`[Migrations] Applying migrations from ${migrationsFolder}...`);

  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl && (dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://"))) {
    await migratePostgres(db, { migrationsFolder });
  } else {
    await migratePglite(db, { migrationsFolder });
  }

  console.log("[Migrations] ✅ All migrations applied successfully!");
}

if (process.argv[1]?.endsWith("migrate.ts") || process.argv[1]?.endsWith("migrate.js")) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Migrations] ❌ Migration failed:", err);
      process.exit(1);
    });
}
