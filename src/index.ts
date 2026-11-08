import { setTimeout as delay } from "node:timers/promises";
import { serve } from "@hono/node-server";
import { app } from "./app.js";
import { config, operatorConfigured } from "./config.js";
import { databaseReady, pool } from "./db/index.js";
import { logger } from "./logger.js";
import { simulateNextJob } from "./services/jobs.js";

const stop = new AbortController();
const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, ({ port, address }) => {
  logger.info({ port, address, demoMode: config.demoMode }, "Ars Factory listening");
});

async function runDemoWorker() {
  while (!stop.signal.aborted) {
    try {
      if (await databaseReady() && !stop.signal.aborted) await simulateNextJob();
    } catch (err) {
      logger.warn({ err }, "Demo job polling failed");
    }
    await delay(1000, undefined, { signal: stop.signal }).catch(() => {});
  }
}

const worker = config.demoMode && operatorConfigured ? runDemoWorker() : Promise.resolve();
async function shutdown() {
  if (stop.signal.aborted) return;
  stop.abort();
  await Promise.all([worker, new Promise<void>((resolve) => server.close(() => resolve()))]);
  await pool?.end();
}

process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
