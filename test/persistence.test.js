import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";
import pg from "pg";

test("migrations, durable job history, cancellation and restart", {
  skip: !process.env.TEST_DATABASE_URL,
  timeout: 25000
}, async () => {
  const schema = "factory_test_" + randomUUID().replaceAll("-", "");
  const db = new pg.Client({ connectionString: process.env.TEST_DATABASE_URL });
  await db.connect();
  const url = new URL(process.env.TEST_DATABASE_URL);
  url.searchParams.set("options", "-c search_path=" + schema);
  const token = "synthetic-operator-token-for-tests-123";
  const env = {
    ...process.env, DATABASE_URL: url.toString(), API_SECRET_TOKEN: token, FACTORY_DEMO_MODE: "true",
    NODE_ENV: "production", HOST: "127.0.0.1", PORT: "0", LOG_LEVEL: "silent"
  };
  let server;
  let pool;
  try {
    await db.query(`CREATE SCHEMA ${schema}`);
    for (let attempt = 0; attempt < 2; attempt++) {
      execFileSync(process.execPath, ["dist/db/migrate.js"], { env, timeout: 8000 });
    }
    const migrations = await db.query(`SELECT version FROM ${schema}.factory_schema_migrations ORDER BY version`);
    assert.deepEqual(migrations.rows.map((row) => row.version), ["001-jobs.sql", "schema.sql"]);
    Object.assign(process.env, env);
    const { app } = await import("../dist/app.js");
    pool = (await import("../dist/db/index.js")).pool;
    const { simulateNextJob } = await import("../dist/services/jobs.js");
    const auth = { Authorization: "Bearer " + token, "Content-Type": "application/json" };
    const create = async (kind, input) => {
      const response = await app.request("/api/v1/" + kind, {
        method: "POST", headers: auth, body: JSON.stringify(input)
      });
      assert.equal(response.status, 201);
      return response.json();
    };
    assert.equal((await app.request("/ready")).status, 200);
    const task = await create("tasks", { name: "Queued task", payload: { synthetic: true } });
    const build = await create("builds", { name: "Queued build", manifest: { entrypoint: "missing.py" } });
    const cancel = () => app.request(`/api/v1/tasks/${task.id}/cancel`, { method: "POST", headers: auth });
    assert.equal((await cancel()).status, 200);
    assert.equal((await cancel()).status, 200);
    await simulateNextJob();
    const listing = await (await app.request("/api/v1/tasks?limit=1", { headers: auth })).json();
    assert.equal(listing.tasks[0].status, "cancelled");
    assert.equal("payload" in listing.tasks[0], false);
    await pool.end();
    pool = undefined;

    server = spawn(process.execPath, ["dist/index.js"], { env: { ...env, LOG_LEVEL: "info" }, stdio: ["ignore", "pipe", "pipe"] });
    const port = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Server startup timed out")), 5000);
      server.once("error", (err) => { clearTimeout(timer); reject(err); });
      server.once("exit", (code) => { clearTimeout(timer); reject(new Error("Server exited with " + code)); });
      let output = "";
      server.stdout.on("data", (chunk) => {
        output += chunk;
        const match = /"port":(\d+)/.exec(output);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
    });
    const get = (path) => fetch("http://127.0.0.1:" + port + path, { headers: auth });
    assert.equal((await get("/ready")).status, 200);
    const storedTask = await (await get(`/api/v1/tasks/${task.id}`)).json();
    assert.deepEqual(storedTask.events.map((event) => event.status), ["queued", "cancelled"]);
    assert.deepEqual(storedTask.payload, { synthetic: true });
    const storedBuild = await (await get(`/api/v1/builds/${build.id}`)).json();
    assert.deepEqual(storedBuild.events.map((event) => event.status), ["queued", "simulated"]);
    assert.equal((await get(`/api/v1/builds/${build.id}/artifact`)).status, 404);

    const queued = await fetch("http://127.0.0.1:" + port + "/api/v1/tasks", {
      method: "POST", headers: auth, body: JSON.stringify({ name: "Worker test" })
    });
    assert.equal(queued.status, 201);
    const workerTask = await queued.json();
    for (let attempt = 0; attempt < 20; attempt++) {
      const current = await (await get(`/api/v1/tasks/${workerTask.id}`)).json();
      if (current.status === "simulated") return;
      await delay(150);
    }
    assert.fail("Worker did not simulate the queued task");
  } finally {
    if (server && server.exitCode === null && server.signalCode === null) {
      const exited = once(server, "exit");
      server.kill();
      await exited;
    }
    await pool?.end();
    await db.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await db.end();
  }
});
