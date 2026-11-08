import { Hono } from "hono";
import { config, operatorConfigured } from "../config.js";
import { databaseReady } from "../db/index.js";

export const healthRoutes = new Hono();

healthRoutes.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: config.serviceName,
    version: config.serviceVersion,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime())
  });
});

healthRoutes.get("/ready", async (c) => {
  const ready = operatorConfigured && await databaseReady();
  return c.json({
    ready,
    service: config.serviceName,
    environment: config.nodeEnv,
    mode: config.demoMode ? "demo" : "read-only",
    timestamp: new Date().toISOString()
  }, ready ? 200 : 503);
});

