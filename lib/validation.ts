import { z } from "zod";
import { categories, stages } from "./domain";
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Choose a valid date");
const boundedMoney = z.number().int().min(0).max(100000000);
export const jobInput = z
  .object({
    customer: z.string().trim().min(2).max(120),
    contact: z.string().trim().max(120).default(""),
    title: z.string().trim().min(3).max(160),
    category: z.enum(categories as [string, ...string[]]),
    value: boundedMoney,
    cost: boundedMoney,
    due: isoDate,
    owner: z.string().trim().min(1).max(60),
    source: z.enum([
      "Website",
      "WhatsApp",
      "Referral",
      "Call",
      "Email",
      "Walk-in",
    ]),
    priority: z.enum(["Normal", "High"]),
    notes: z.string().trim().max(5000).default(""),
  })
  .strict();
export const taskInput = z
  .object({
    title: z.string().trim().min(3).max(160),
    customer: z.string().trim().max(120).default(""),
    due: isoDate,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  })
  .strict();
export const actionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("createJob"), job: jobInput }),
  z.object({
    action: z.literal("editJob"),
    id: z.string(),
    version: z.number().int(),
    job: jobInput,
  }),
  z.object({
    action: z.literal("advance"),
    id: z.string(),
    version: z.number().int(),
    stage: z.enum(stages),
  }),
  z.object({
    action: z.literal("approveArtwork"),
    id: z.string(),
    version: z.number().int(),
    reference: z.string().trim().min(4).max(1000),
  }),
  z.object({
    action: z.literal("passQC"),
    id: z.string(),
    version: z.number().int(),
    reference: z.string().trim().min(4).max(1000),
  }),
  z.object({
    action: z.literal("recordDelivery"),
    id: z.string(),
    version: z.number().int(),
    reference: z.string().trim().min(4).max(1000),
  }),
  z.object({
    action: z.literal("payment"),
    id: z.string(),
    version: z.number().int(),
    amount: boundedMoney.refine((n) => n > 0),
    reference: z.string().trim().min(3).max(200),
  }),
  z.object({
    action: z.literal("note"),
    id: z.string(),
    text: z.string().trim().min(1).max(5000),
  }),
  z.object({ action: z.literal("createTask"), task: taskInput }),
  z.object({
    action: z.literal("completeTask"),
    id: z.string(),
    done: z.boolean(),
  }),
]);
