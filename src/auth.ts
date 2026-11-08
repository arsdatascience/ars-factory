import { createHash, timingSafeEqual } from "node:crypto";
import { createMiddleware } from "hono/factory";
import { config, operatorConfigured } from "./config.js";

const digest = (value: string) => createHash("sha256").update(value).digest();
const expected = digest(config.apiSecretToken);

export const requireOperator = createMiddleware(async (c, next) => {
  c.header("Cache-Control", "no-store");
  if (!operatorConfigured) return c.json({ error: "Operator access is not configured" }, 503);

  const authorization = c.req.header("Authorization") ?? "";
  const match = /^(Bearer|Basic) (\S+)$/i.exec(authorization);
  let token = "";
  if (match?.[1].toLowerCase() === "bearer") {
    token = match[2];
  } else if (match) {
    const credentials = Buffer.from(match[2], "base64").toString("utf8");
    if (credentials.startsWith("operator:")) token = credentials.slice("operator:".length);
  }

  if (!timingSafeEqual(expected, digest(token))) {
    c.header("WWW-Authenticate", c.req.path === "/" ? 'Basic realm="Ars Factory", charset="UTF-8"' : "Bearer");
    return c.json({ error: "Authentication required" }, 401);
  }
  await next();
});
