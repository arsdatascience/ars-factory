import { Hono } from "hono";
import { config } from "../config.js";
import { taskOrchestrator } from "../services/task-orchestrator.js";

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

healthRoutes.get("/ready", (c) => {
  const stats = taskOrchestrator.getStats();
  return c.json({
    ready: true,
    service: config.serviceName,
    environment: config.nodeEnv,
    activeTasks: stats.activeTasks,
    timestamp: new Date().toISOString()
  });
});
