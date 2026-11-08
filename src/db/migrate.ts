import { readFile } from "node:fs/promises";
import { config } from "../config.js";
import { pool } from "./index.js";

if (!pool) throw new Error("DATABASE_URL is required to migrate");

const allowedHosts = process.env.FACTORY_MIGRATION_HOSTS?.split(",").map((host) => host.trim());
if (allowedHosts && !allowedHosts.includes(new URL(config.databaseUrl!).hostname)) {
  throw new Error("DATABASE_URL host is outside FACTORY_MIGRATION_HOSTS");
}

try {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1)", [47320611]);
    await client.query(`CREATE TABLE IF NOT EXISTS factory_schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )`);
    for (const version of ["001-jobs.sql", "schema.sql"]) {
      const existing = await client.query("SELECT 1 FROM factory_schema_migrations WHERE version = $1", [version]);
      if (existing.rowCount) continue;
      await client.query(await readFile(new URL(version, import.meta.url), "utf8"));
      await client.query("INSERT INTO factory_schema_migrations (version) VALUES ($1)", [version]);
    }
    await client.query("COMMIT");
    console.log("Factory database migrations applied");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
} finally {
  await pool.end();
}
