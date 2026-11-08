import { z } from "zod";

export const jobId = z.uuid();
export const jobName = z.string().trim().min(2).max(160);
export const jobInput = z.record(z.string(), z.unknown()).default({});
export const maxOffset = 10_000;
export const paging = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).max(maxOffset).default(0)
});
