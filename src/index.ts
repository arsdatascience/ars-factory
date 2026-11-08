import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { config } from "./config.js";
import { logger } from "./logger.js";
import { healthRoutes } from "./routes/health.js";
import { taskRoutes } from "./routes/tasks.js";
import { buildRoutes } from "./routes/builds.js";
import { metricsRoutes } from "./routes/metrics.js";
import { renderDashboardHtml } from "./ui.js";
import { initDatabase } from "./db/index.js";

const app = new Hono();

// Global Request Logger Middleware
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  // Don't log healthcheck spam
  if (c.req.path !== "/health" && c.req.path !== "/metrics") {
    logger.info({
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: duration
    }, "HTTP Request");
  }
});

// UI Route (Mission Control & Observability Dashboard)
app.get("/", (c) => {
  return c.html(renderDashboardHtml());
});

// Mount Routes
app.route("/", healthRoutes);
app.route("/", metricsRoutes);
app.route("/api/v1", taskRoutes);
app.route("/api/v1", buildRoutes);

// 404 Handler
app.notFound((c) => {
  return c.json({ error: "Not Found", path: c.req.path }, 404);
});

// Global Error Handler
app.onError((err, c) => {
  logger.error({ error: err.message, stack: err.stack }, "Unhandled exception");
  return c.json({ error: "Internal Server Error", message: err.message }, 500);
});

// Initialize PostgreSQL / TimescaleDB Persistent Tables
initDatabase().catch((err) => {
  logger.warn({ err }, "Database initialization deferred.");
});

// Server Startup
serve({
  fetch: app.fetch,
  port: config.port,
  hostname: config.host
}, (info) => {
  logger.info(
    {
      service: config.serviceName,
      port: info.port,
      env: config.nodeEnv,
      url: `http://${info.address}:${info.port}`
    },
    "🚀 Ars Factory Orchestrator service running"
  );
});

