import { randomUUID } from "node:crypto";
import { query } from "../db/index.js";

type JobKind = "task" | "build";
type JobStatus = "queued" | "simulated" | "cancelled";

interface JobSummary {
  id: string;
  kind: JobKind;
  name: string;
  target: string;
  status: JobStatus;
  createdAt: Date;
  completedAt: Date | null;
}

interface JobDetail extends JobSummary {
  input: Record<string, unknown>;
  events: { status: JobStatus; timestamp: string }[];
}

const summary = 'id, kind, name, target, status, created_at AS "createdAt", finished_at AS "completedAt"';

function jobResponse(job: JobSummary | JobDetail) {
  const { id, kind, name, target, status, createdAt, completedAt } = job;
  const fields = { id, name, status, createdAt, completedAt };
  if (kind === "task") {
    return { ...fields, type: target, ...("input" in job && { payload: job.input, events: job.events }) };
  }
  return { ...fields, targetPlatform: target, ...("input" in job && { manifest: job.input, events: job.events }) };
}

export async function createJob(kind: JobKind, name: string, target: string, input: Record<string, unknown>) {
  const { rows } = await query<JobSummary>(
    `INSERT INTO factory_jobs (id, kind, name, target, input)
     VALUES ($1, $2, $3, $4, $5) RETURNING ${summary}`,
    [randomUUID(), kind, name, target, JSON.stringify(input)]
  );
  return jobResponse(rows[0]);
}

export async function listJobs(kind: JobKind, limit: number, offset: number) {
  const { rows } = await query<JobSummary>(
    `SELECT ${summary} FROM factory_jobs WHERE kind = $1
     ORDER BY created_at DESC, id DESC LIMIT $2 OFFSET $3`,
    [kind, limit + 1, offset]
  );
  return { items: rows.slice(0, limit).map(jobResponse), nextOffset: rows.length > limit ? offset + limit : null };
}

export async function getJob(kind: JobKind, id: string) {
  const { rows } = await query<JobDetail>(
    `SELECT ${summary}, input, (
        SELECT json_agg(json_build_object('status', status, 'timestamp', created_at) ORDER BY id)
        FROM factory_job_events WHERE job_id = factory_jobs.id
      ) AS events
      FROM factory_jobs WHERE kind = $1 AND id = $2`,
    [kind, id]
  );
  return rows[0] && jobResponse(rows[0]);
}

export async function cancelTask(id: string) {
  const { rowCount } = await query(
    `UPDATE factory_jobs SET status = 'cancelled', finished_at = clock_timestamp()
     WHERE kind = 'task' AND id = $1 AND status = 'queued'`,
    [id]
  );
  return rowCount === 1;
}

// Demo jobs have no external effects. A single atomic transition prevents
// duplicate execution by replicas and avoids leaving a job in flight on restart.
export async function simulateNextJob() {
  await query(`UPDATE factory_jobs SET status = 'simulated', finished_at = clock_timestamp()
    WHERE id = (
      SELECT id FROM factory_jobs WHERE status = 'queued'
      ORDER BY created_at, id LIMIT 1 FOR UPDATE SKIP LOCKED
    )`);
}

export async function jobStats() {
  const { rows } = await query<{ kind: JobKind; status: JobStatus; count: number }>(
    "SELECT kind, status, count(*)::int FROM factory_jobs GROUP BY kind, status"
  );
  const tasks = { totalTasks: 0, activeTasks: 0, completed: 0, failed: 0, queued: 0, simulated: 0, cancelled: 0 };
  const builds = { total: 0, ready: 0, building: 0, failed: 0, queued: 0, simulated: 0, cancelled: 0 };
  for (const { kind, status, count } of rows) {
    if (kind === "task") {
      tasks.totalTasks += count;
      tasks[status] = count;
    } else {
      builds.total += count;
      builds[status] = count;
    }
  }
  return { tasks, builds };
}
