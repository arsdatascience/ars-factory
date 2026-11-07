import { Hono } from "hono";
import { z } from "zod";
import { robotBuilder } from "../services/robot-builder.js";

export const buildRoutes = new Hono();

const createBuildSchema = z.object({
  name: z.string().min(2, "Robot name must have at least 2 characters"),
  targetPlatform: z.enum(["linux-x64", "win-x64", "docker"]).default("docker"),
  manifest: z.record(z.unknown()).optional()
});

buildRoutes.get("/builds", (c) => {
  const builds = robotBuilder.listBuilds();
  return c.json({
    count: builds.length,
    builds
  });
});

buildRoutes.get("/builds/:id", (c) => {
  const id = c.req.param("id");
  const build = robotBuilder.getBuild(id);
  if (!build) {
    return c.json({ error: "Robot build not found" }, 404);
  }
  return c.json(build);
});

buildRoutes.post("/builds", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createBuildSchema.parse(body);
    const build = robotBuilder.createBuild(parsed.name, parsed.targetPlatform, parsed.manifest || {});
    return c.json(build, 201);
  } catch (err: any) {
    return c.json({ error: err.errors || err.message }, 400);
  }
});

buildRoutes.get("/builds/:id/artifact", (c) => {
  const id = c.req.param("id");
  const build = robotBuilder.getBuild(id);
  if (!build || build.status !== "ready") {
    return c.json({ error: "Artifact not ready or not found" }, 404);
  }
  return c.json({
    buildId: build.id,
    robotName: build.name,
    version: build.version,
    platform: build.targetPlatform,
    sizeMb: build.artifactSizeMb,
    message: "Artifact available for deployment/download",
    generatedAt: build.completedAt
  });
});
