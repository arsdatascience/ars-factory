import { Hono } from "hono";
import { z } from "zod";
import { taskOrchestrator } from "../services/task-orchestrator.js";

export const taskRoutes = new Hono();

const createTaskSchema = z.object({
  name: z.string().min(2, "Task name must have at least 2 characters"),
  type: z.enum(["rpa", "data_pipeline", "build", "sync", "custom"]).default("rpa"),
  payload: z.record(z.unknown()).optional()
});

taskRoutes.get("/tasks", (c) => {
  const limit = Number(c.req.query("limit") || 50);
  const tasks = taskOrchestrator.listTasks(limit);
  return c.json({
    count: tasks.length,
    tasks
  });
});

taskRoutes.get("/tasks/:id", (c) => {
  const id = c.req.param("id");
  const task = taskOrchestrator.getTask(id);
  if (!task) {
    return c.json({ error: "Task not found" }, 404);
  }
  return c.json(task);
});

taskRoutes.post("/tasks", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createTaskSchema.parse(body);
    const task = taskOrchestrator.createTask(parsed.name, parsed.type, parsed.payload || {});
    return c.json(task, 201);
  } catch (err: any) {
    return c.json({ error: err.errors || err.message }, 400);
  }
});

taskRoutes.post("/tasks/:id/cancel", (c) => {
  const id = c.req.param("id");
  const success = taskOrchestrator.cancelTask(id);
  if (!success) {
    return c.json({ error: "Cannot cancel task (not found or already finished)" }, 400);
  }
  return c.json({ message: "Task cancelled successfully" });
});

