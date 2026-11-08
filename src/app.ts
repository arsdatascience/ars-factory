import { randomBytes } from "node:crypto";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import { requireOperator } from "./auth.js";
import { config } from "./config.js";
import { DatabaseUnavailable } from "./db/index.js";
import { logger } from "./logger.js";
import { buildRoutes } from "./routes/builds.js";
import { healthRoutes } from "./routes/health.js";
import { metricsRoutes } from "./routes/metrics.js";
import { taskRoutes } from "./routes/tasks.js";
import { renderDashboardHtml } from "./ui.js";

export const app = new Hono();

app.use("*", secureHeaders({ strictTransportSecurity: false }));
app.use("*", async (c, next) => {
  const start = Date.now();
  await next();
  if (c.req.path !== "/health" && c.req.path !== "/metrics") {
    logger.info({ method: c.req.method, status: c.res.status, durationMs: Date.now() - start }, "HTTP request");
  }
});

app.use("/", requireOperator);
app.use("/metrics", requireOperator);
app.use("/api/v1/*", requireOperator);
app.use("/api/v1/*", async (c, next) => {
  if (c.req.method === "POST") {
    const contentType = c.req.header("Content-Type")?.split(";")[0].trim().toLowerCase();
    if (contentType !== "application/json") return c.json({ error: "Expected application/json" }, 415);
  }
  await next();
});
app.use("/api/v1/*", bodyLimit({
  maxSize: 64 * 1024,
  onError: (c) => c.json({ error: "Request body exceeds 64 KiB" }, 413)
}));

app.get("/", (c) => {
  const nonce = randomBytes(18).toString("base64");
  c.header("Content-Security-Policy", [
    "default-src 'self'", `script-src 'nonce-${nonce}'`,
    `style-src 'nonce-${nonce}' https://cdnjs.cloudflare.com`,
    "font-src https://cdnjs.cloudflare.com", "base-uri 'none'", "frame-ancestors 'none'", "form-action 'none'"
  ].join("; "));
  return c.html(renderDashboardHtml(nonce, config.demoMode));
});

app.route("/", healthRoutes);
app.route("/", metricsRoutes);
app.route("/api/v1", taskRoutes);
app.route("/api/v1", buildRoutes);

app.notFound((c) => c.json({ error: "Not Found" }, 404));
app.onError((err, c) => {
  if (err instanceof SyntaxError) return c.json({ error: "Invalid JSON" }, 400);
  if (err instanceof DatabaseUnavailable) return c.json({ error: "Factory database unavailable" }, 503);
  logger.error({ err }, "Unhandled exception");
  return c.json({ error: "Internal Server Error" }, 500);
});
