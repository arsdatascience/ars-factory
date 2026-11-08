import pg from "pg";
import { config } from "../config.js";
import { logger } from "../logger.js";

export const pool = config.databaseUrl ? new pg.Pool({
  connectionString: config.databaseUrl,
  max: 10,
  connectionTimeoutMillis: 2000,
  statement_timeout: 5000
}) : undefined;

pool?.on("error", (err) => logger.error({ err }, "Idle PostgreSQL connection failed"));

export class DatabaseUnavailable extends Error {}

export async function query<Row extends pg.QueryResultRow>(sql: string, params: unknown[] = []) {
  if (!pool) throw new DatabaseUnavailable("DATABASE_URL is required");
  try {
    return await pool.query<Row>(sql, params);
  } catch (err) {
    logger.error({ code: (err as { code?: string }).code }, "Factory database query failed");
    throw new DatabaseUnavailable("Factory database unavailable");
  }
}

export async function databaseReady() {
  if (!pool) return false;
  try {
    const { rows } = await pool.query<{ ready: boolean }>(
      `SELECT EXISTS (SELECT 1 FROM factory_schema_migrations WHERE version = '001-jobs.sql')
        AND has_table_privilege(to_regclass('factory_jobs'), 'SELECT')
        AND has_table_privilege(to_regclass('factory_job_events'), 'SELECT')
        AND (NOT $1 OR (
          has_table_privilege(to_regclass('factory_jobs'), 'INSERT')
          AND has_table_privilege(to_regclass('factory_jobs'), 'UPDATE')
          AND has_table_privilege(to_regclass('factory_job_events'), 'INSERT')
        )) AS ready`,
      [config.demoMode]
    );
    return rows[0].ready === true;
  } catch {
    return false;
  }
}
