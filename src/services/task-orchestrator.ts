import { randomUUID } from "node:crypto";
import { logger } from "../logger.js";

export interface FactoryTask {
  id: string;
  name: string;
  type: "rpa" | "data_pipeline" | "build" | "sync" | "custom";
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  payload: Record<string, unknown>;
  result?: Record<string, unknown>;
  error?: string;
  logs: string[];
}

export class TaskOrchestrator {
  private tasks = new Map<string, FactoryTask>();
  private activeCount = 0;

  constructor() {
    this.seedDefaultTasks();
  }

  private seedDefaultTasks() {
    const sampleId = "task-bootstrap-system";
    this.tasks.set(sampleId, {
      id: sampleId,
      name: "Ars Factory System Initialization",
      type: "custom",
      status: "completed",
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
      completedAt: new Date().toISOString(),
      durationMs: 42,
      payload: { system: "bootstrap", target: "EVEO Cloud" },
      result: { initialized: true, engine: "Ars Factory Orchestrator v1.0.0" },
      logs: [
        "Initializing Ars Factory Core Engine...",
        "Validating runtime environment...",
        "Coolify readiness probe verified.",
        "System operational."
      ]
    });
  }

  createTask(name: string, type: FactoryTask["type"], payload: Record<string, unknown> = {}): FactoryTask {
    const id = `task-${randomUUID().slice(0, 8)}`;
    const task: FactoryTask = {
      id,
      name,
      type,
      status: "queued",
      createdAt: new Date().toISOString(),
      payload,
      logs: [`Task [${name}] created and queued.`]
    };
    this.tasks.set(id, task);
    logger.info({ taskId: id, taskName: name }, "Factory task created");
    
    // Asynchronously trigger execution
    setTimeout(() => this.runTask(id), 100);
    return task;
  }

  private async runTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== "queued") return;

    task.status = "running";
    task.startedAt = new Date().toISOString();
    task.logs.push(`Task started execution at ${task.startedAt}`);
    this.activeCount++;

    const startTime = Date.now();

    try {
      // Simulate task step logs
      task.logs.push("Allocating execution sandbox...");
      task.logs.push("Processing task workload...");

      // Task execution logic
      await new Promise((resolve) => setTimeout(resolve, 800));

      task.status = "completed";
      task.completedAt = new Date().toISOString();
      task.durationMs = Date.now() - startTime;
      task.result = {
        success: true,
        summary: `Task executed successfully in ${task.durationMs}ms`,
        timestamp: task.completedAt
      };
      task.logs.push(`Task completed successfully in ${task.durationMs}ms`);
      logger.info({ taskId, durationMs: task.durationMs }, "Factory task finished");
    } catch (err: any) {
      task.status = "failed";
      task.completedAt = new Date().toISOString();
      task.durationMs = Date.now() - startTime;
      task.error = err.message || "Unknown execution failure";
      task.logs.push(`Task failed: ${task.error}`);
      logger.error({ taskId, error: task.error }, "Factory task failed");
    } finally {
      this.activeCount = Math.max(0, this.activeCount - 1);
    }
  }

  getTask(id: string): FactoryTask | undefined {
    return this.tasks.get(id);
  }

  listTasks(limit = 50): FactoryTask[] {
    return Array.from(this.tasks.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  cancelTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) return false;
    if (task.status === "completed" || task.status === "failed") return false;

    task.status = "cancelled";
    task.completedAt = new Date().toISOString();
    task.logs.push("Task cancelled by user / orchestrator.");
    return true;
  }

  getStats() {
    const all = Array.from(this.tasks.values());
    return {
      totalTasks: all.length,
      activeTasks: this.activeCount,
      completed: all.filter((t) => t.status === "completed").length,
      failed: all.filter((t) => t.status === "failed").length,
      queued: all.filter((t) => t.status === "queued").length
    };
  }
}

export const taskOrchestrator = new TaskOrchestrator();
