import pg from "pg";
import { config } from "../config.js";
import { logger } from "../logger.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgres://postgres:postgres@localhost:5432/postgres",
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

export async function initDatabase(): Promise<boolean> {
  try {
    const client = await pool.connect();
    try {
      logger.info("Initializing database schema for persistent monitoring and threat logs...");
      const schemaSqlPath = path.join(__dirname, "schema.sql");
      if (fs.existsSync(schemaSqlPath)) {
        const sql = fs.readFileSync(schemaSqlPath, "utf-8");
        await client.query(sql);
        logger.info("Database schema initialized and verified successfully!");
      } else {
        logger.warn("schema.sql not found at " + schemaSqlPath);
      }
      return true;
    } finally {
      client.release();
    }
  } catch (err) {
    logger.warn({ err }, "Could not auto-migrate PostgreSQL on local boot (expected if running outside server network).");
    return false;
  }
}

// Log persistence helpers
export async function logMonitoringEvent(level: string, source: string, message: string, metadata: Record<string, unknown> = {}, project = "ars-factory") {
  try {
    await pool.query(
      `INSERT INTO monitoring_logs (level, source, project, message, metadata) VALUES ($1, $2, $3, $4, $5)`,
      [level, source, project, message, JSON.stringify(metadata)]
    );
  } catch (err) {
    logger.error({ err }, "Failed to persist monitoring log to PostgreSQL");
  }
}

export async function recordSecurityEvent(eventType: string, sourceIp: string, severity = "HIGH", targetService = "api", details: Record<string, unknown> = {}) {
  try {
    await pool.query(
      `INSERT INTO security_threat_events (event_type, source_ip, target_service, severity, details) VALUES ($1, $2, $3, $4, $5)`,
      [eventType, sourceIp, targetService, severity, JSON.stringify(details)]
    );
  } catch (err) {
    logger.error({ err }, "Failed to record security event in PostgreSQL");
  }
}

export async function syncBlacklistedIp(ip: string, reason: string, expiresInHours = 24) {
  try {
    const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000);
    await pool.query(
      `INSERT INTO active_blacklisted_ips (ip_address, reason, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (ip_address) DO UPDATE
       SET offense_count = active_blacklisted_ips.offense_count + 1,
           expires_at = EXCLUDED.expires_at,
           is_active = TRUE`,
      [ip, reason, expiresAt]
    );
  } catch (err) {
    logger.error({ err }, "Failed to sync blacklisted IP to PostgreSQL");
  }
}
