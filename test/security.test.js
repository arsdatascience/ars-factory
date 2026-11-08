import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";

const token = "synthetic-operator-token-for-tests-123";
const metricsToken = "synthetic-metrics-token-for-tests-123";
Object.assign(process.env, { API_SECRET_TOKEN: token, METRICS_SECRET_TOKEN: metricsToken, DATABASE_URL: "", FACTORY_DEMO_MODE: "true", LOG_LEVEL: "silent" });
const { app } = await import("../dist/app.js");

test("operational endpoints require a valid credential", async () => {
  const routes = [
    ["/", "GET"], ["/metrics", "GET"], ["/api/v1/metrics", "GET"],
    ["/api/v1/monitoring/services", "GET"], ["/api/v1/tasks", "GET"],
    ["/api/v1/%74asks", "GET"], ["/api/v1/tasks", "POST"], ["/api/v1/tasks/example/cancel", "POST"],
    ["/api/v1/builds", "POST"], ["/api/v1/builds/example/artifact", "GET"]
  ];
  for (const [path, method] of routes) {
    assert.equal((await app.request(path, { method })).status, 401, path);
  }
  const invalid = await app.request("/api/v1/tasks", { headers: { Authorization: "Bearer wrong" } });
  assert.equal(invalid.status, 401);
  assert.equal((await app.request("/health")).status, 200);
  assert.equal((await app.request("/ready")).status, 503);
});

test("the collector credential only authenticates the Prometheus endpoint", async () => {
  const headers = { Authorization: "Bearer " + metricsToken };
  const metrics = await app.request("/metrics", { headers });
  assert.equal(metrics.status, 503);
  assert.equal((await metrics.json()).error, "Factory database unavailable");
  for (const route of ["/", "/api/v1/tasks", "/api/v1/metrics"]) {
    assert.equal((await app.request(route, { headers })).status, 401);
  }
});

test("mutation requests enforce JSON, size and schema limits", async () => {
  const request = (body, contentType = "application/json") => app.request("/api/v1/tasks", {
    method: "POST",
    body,
    headers: { Authorization: "Bearer " + token, "Content-Type": contentType }
  });
  assert.equal((await request("name=test", "text/plain")).status, 415);
  assert.equal((await request(JSON.stringify({ name: "x".repeat(65536) }))).status, 413);
  assert.equal((await request("{")).status, 400);
  assert.equal((await request(JSON.stringify({ name: "x".repeat(161) }))).status, 400);
  const badPage = await app.request("/api/v1/builds?limit=101", { headers: { Authorization: "Bearer " + token } });
  assert.equal(badPage.status, 400);
});

test("the authenticated dashboard writes task and build names as text", async () => {
  const auth = "Basic " + Buffer.from("operator:" + token).toString("base64");
  const response = await app.request("/", { headers: { Authorization: auth } });
  assert.equal(response.status, 200);
  const nonce = /script-src 'nonce-([^']+)'/.exec(response.headers.get("content-security-policy"))[1];
  const html = await response.text();
  const scripts = [...html.matchAll(/<script nonce="([^"]+)">([\s\S]*?)<\/script>/g)];
  assert.equal(scripts.at(-1)[1], nonce);
  const marker = '<img src=x onerror="alert(1)">';
  const nodes = new Map();
  function element() {
    return {
      children: [],
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      addEventListener() {},
      set innerHTML(value) { assert.fail("Unexpected HTML sink: " + value); }
    };
  }
  vm.runInNewContext(scripts.at(-1)[2], {
    setTimeout() {},
    document: {
      getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, element());
        return nodes.get(id);
      },
      createElement: element
    },
    async fetch(path) {
      const kind = path.split("/").at(-1);
      const data = kind === "metrics" ? { tasks: {}, builds: {}, system: { memory: {} } }
        : { [kind]: [{ name: marker, status: "queued", id: "synthetic" }] };
      return { ok: true, json: async () => data };
    }
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(nodes.get("tasks-container").children[0].children[0].textContent, marker);
  assert.equal(nodes.get("builds-container").children[0].children[0].textContent, marker);
});
