import { Hono } from "hono";
import { z } from "zod";
import { config } from "../config.js";
import { cancelTask, createJob, getJob, listJobs } from "../services/jobs.js";
import { jobId, jobInput, jobName, maxOffset, paging } from "./job-input.js";

export const taskRoutes = new Hono();
const taskInput = z.object({
  name: jobName,
  type: z.enum(["rpa", "data_pipeline", "build", "sync", "custom"]).default("rpa"),
  payload: jobInput
});

taskRoutes.get("/tasks", async (c) => {
  const page = paging.safeParse(c.req.query());
  if (!page.success) return c.json({ error: "Invalid pagination" }, 400);
  const { items, nextOffset } = await listJobs("task", page.data.limit, page.data.offset);
  return c.json({
    count: items.length,
    tasks: items,
    nextOffset: nextOffset !== null && nextOffset <= maxOffset ? nextOffset : null
  });
});

taskRoutes.get("/tasks/:id", async (c) => {
  const id = jobId.safeParse(c.req.param("id"));
  const task = id.success && await getJob("task", id.data);
  return task ? c.json(task) : c.json({ error: "Task not found" }, 404);
});

taskRoutes.post("/tasks", async (c) => {
  if (!config.demoMode) return c.json({ error: "Task execution is unavailable" }, 503);
  const task = taskInput.safeParse(await c.req.json());
  if (!task.success) return c.json({ error: "Invalid task" }, 400);
  const { name, type, payload } = task.data;
  return c.json(await createJob("task", name, type, payload), 201);
});

taskRoutes.post("/tasks/:id/cancel", async (c) => {
  if (!config.demoMode) return c.json({ error: "Task cancellation is unavailable" }, 503);
  const id = jobId.safeParse(c.req.param("id"));
  if (!id.success) return c.json({ error: "Task not found" }, 404);
  if (await cancelTask(id.data)) return c.json({ status: "cancelled" });
  const task = await getJob("task", id.data);
  if (task?.status === "cancelled") return c.json({ status: "cancelled" });
  return task ? c.json({ error: "Task is no longer queued" }, 409) : c.json({ error: "Task not found" }, 404);
});
