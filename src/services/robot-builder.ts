import { randomUUID } from "node:crypto";
import { logger } from "../logger.js";

export interface RobotBuild {
  id: string;
  name: string;
  version: string;
  targetPlatform: "linux-x64" | "win-x64" | "docker";
  status: "building" | "ready" | "failed";
  createdAt: string;
  completedAt?: string;
  artifactSizeMb?: number;
  downloadUrl?: string;
  manifest: Record<string, unknown>;
  logs: string[];
}

export class RobotBuilder {
  private builds = new Map<string, RobotBuild>();

  constructor() {
    this.seedDefaultBuild();
  }

  private seedDefaultBuild() {
    const id = "build-sample-crawler";
    this.builds.set(id, {
      id,
      name: "Robot Fiscal Scraper & Validator",
      version: "1.0.0",
      targetPlatform: "docker",
      status: "ready",
      createdAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      artifactSizeMb: 14.2,
      downloadUrl: `/api/v1/builds/${id}/artifact`,
      manifest: {
        schemaVersion: 1,
        entrypoint: "robot.py",
        dependencies: ["requests", "playwright"]
      },
      logs: [
        "Analyzing build manifest...",
        "Resolving runtime dependencies...",
        "Generating containerized RPA bundle...",
        "Build finished successfully."
      ]
    });
  }

  createBuild(name: string, targetPlatform: RobotBuild["targetPlatform"] = "docker", manifest: Record<string, unknown> = {}): RobotBuild {
    const id = `build-${randomUUID().slice(0, 8)}`;
    const build: RobotBuild = {
      id,
      name,
      version: "1.0.0",
      targetPlatform,
      status: "building",
      createdAt: new Date().toISOString(),
      manifest,
      logs: [`Build job created for robot [${name}].`]
    };
    this.builds.set(id, build);
    logger.info({ buildId: id, name }, "Robot build job started");

    setTimeout(() => this.processBuild(id), 150);
    return build;
  }

  private async processBuild(buildId: string) {
    const build = this.builds.get(buildId);
    if (!build) return;

    try {
      build.logs.push("Compiling RPA specification and task graph...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      build.logs.push("Packaging standalone bundle and injecting runtime hooks...");
      await new Promise((resolve) => setTimeout(resolve, 600));

      build.status = "ready";
      build.completedAt = new Date().toISOString();
      build.artifactSizeMb = Number((10 + Math.random() * 8).toFixed(1));
      build.downloadUrl = `/api/v1/builds/${buildId}/artifact`;
      build.logs.push(`Package ready: ${build.artifactSizeMb} MB`);
      logger.info({ buildId, artifactSizeMb: build.artifactSizeMb }, "Robot build completed");
    } catch (err: any) {
      build.status = "failed";
      build.completedAt = new Date().toISOString();
      build.logs.push(`Build failed: ${err.message}`);
      logger.error({ buildId, error: err.message }, "Robot build failed");
    }
  }

  getBuild(id: string): RobotBuild | undefined {
    return this.builds.get(id);
  }

  listBuilds(): RobotBuild[] {
    return Array.from(this.builds.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const robotBuilder = new RobotBuilder();

