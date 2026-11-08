import { Hono } from "hono";
import { z } from "zod";
import { config } from "../config.js";
import { createJob, getJob, listJobs } from "../services/jobs.js";
import { jobId, jobInput, jobName, maxOffset, paging } from "./job-input.js";

export const buildRoutes = new Hono();
const buildInput = z.object({
  name: jobName,
  targetPlatform: z.enum(["linux-x64", "win-x64", "docker"]).default("docker"),
  manifest: jobInput
});

buildRoutes.get("/builds", async (c) => {
  const page = paging.safeParse(c.req.query());
  if (!page.success) return c.json({ error: "Invalid pagination" }, 400);
  const { items, nextOffset } = await listJobs("build", page.data.limit, page.data.offset);
  return c.json({
    count: items.length,
    builds: items,
    nextOffset: nextOffset !== null && nextOffset <= maxOffset ? nextOffset : null
  });
});

buildRoutes.get("/builds/:id", async (c) => {
  const id = jobId.safeParse(c.req.param("id"));
  const build = id.success && await getJob("build", id.data);
  return build ? c.json(build) : c.json({ error: "Robot build not found" }, 404);
});

buildRoutes.post("/builds", async (c) => {
  if (!config.demoMode) return c.json({ error: "Robot compilation is unavailable" }, 503);
  const build = buildInput.safeParse(await c.req.json());
  if (!build.success) return c.json({ error: "Invalid build" }, 400);
  const { name, targetPlatform, manifest } = build.data;
  return c.json(await createJob("build", name, targetPlatform, manifest), 201);
});

buildRoutes.get("/builds/:id/artifact", (c) => c.json({ error: "Artifact not available" }, 404));
