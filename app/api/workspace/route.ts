import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database } from "@/db";
import {
  seedWorkspace,
  Job,
  Workspace,
  stages,
  transitionError,
} from "@/lib/domain";
import { actionInput } from "@/lib/validation";
export const dynamic = "force-dynamic";
const response = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
async function read(owner: string): Promise<Workspace> {
  const db = database();
  const [j, t, e, f] = await Promise.all([
    db
      .prepare("SELECT payload FROM jobs WHERE owner=? ORDER BY id DESC")
      .bind(owner)
      .all<{ payload: string }>(),
    db
      .prepare("SELECT payload FROM tasks WHERE owner=?")
      .bind(owner)
      .all<{ payload: string }>(),
    db
      .prepare(
        "SELECT id,job_id as jobId,message,at FROM events WHERE owner=? ORDER BY at DESC LIMIT 200",
      )
      .bind(owner)
      .all(),
    db
      .prepare(
        "SELECT id,job_id as jobId,name,size,content_type as contentType,at FROM files WHERE owner=? ORDER BY at DESC",
      )
      .bind(owner)
      .all(),
  ]);
  return {
    jobs: j.results.map((x) => JSON.parse(x.payload)),
    tasks: t.results.map((x) => JSON.parse(x.payload)),
    events: e.results,
    files: f.results,
  } as Workspace;
}
async function initialize(owner: string) {
  const db = database();
  const exists = await db
    .prepare("SELECT owner FROM workspace WHERE owner=?")
    .bind(owner)
    .first();
  if (exists) return;
  const seed = seedWorkspace();
  const queries = [
    ...seed.jobs.map((j) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO jobs(owner,id,payload,version) VALUES(?,?,?,1)",
        )
        .bind(owner, j.id, JSON.stringify(j)),
    ),
    ...seed.tasks.map((t) =>
      db
        .prepare("INSERT OR IGNORE INTO tasks(owner,id,payload) VALUES(?,?,?)")
        .bind(owner, t.id, JSON.stringify(t)),
    ),
    ...seed.events.map((e) =>
      db
        .prepare(
          "INSERT OR IGNORE INTO events(id,owner,job_id,message,at) VALUES(?,?,?,?,?)",
        )
        .bind(`${owner}:${e.id}`, owner, e.jobId, e.message, e.at),
    ),
    db
      .prepare("INSERT OR IGNORE INTO workspace(owner,created_at) VALUES(?,?)")
      .bind(owner, new Date().toISOString()),
  ];
  await db.batch(queries);
}
export async function GET() {
  try {
    const user = await getChatGPTUser();
    if (!user)
      return response({ error: "Sign in to access this workspace." }, 401);
    await initialize(user.userId);
    return response({
      ...(await read(user.userId)),
      user: { name: user.displayName, email: user.email },
    });
  } catch (error) {
    console.error("Workspace load failed", error);
    return response(
      { error: "Could not load your workspace. Please try again." },
      503,
    );
  }
}
export async function POST(request: Request) {
  try {
    const user = await getChatGPTUser();
    if (!user) return response({ error: "Sign in to save changes." }, 401);
    if (request.headers.get("origin") !== new URL(request.url).origin)
      return response(
        { error: "This request must come from the workspace." },
        403,
      );
    if (Number(request.headers.get("content-length") || 0) > 50000)
      return response({ error: "Request is too large." }, 413);
    const parsed = actionInput.safeParse(await request.json());
    if (!parsed.success)
      return response(
        {
          error:
            parsed.error.issues[0]?.message || "Check the submitted fields.",
        },
        400,
      );
    const a = parsed.data;
    const db = database(),
      owner = user.userId;
    const eventId = crypto.randomUUID(),
      at = new Date().toISOString();
    if (a.action === "createJob") {
      const id = `TP-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const job: Job = {
        ...a.job,
        id,
        stage: "New lead",
        paid: 0,
        artworkApproved: false,
        qcPassed: false,
        version: 1,
        createdAt: at.slice(0, 10),
      };
      await db.batch([
        db
          .prepare("INSERT INTO jobs(owner,id,payload,version) VALUES(?,?,?,1)")
          .bind(owner, id, JSON.stringify(job)),
        db
          .prepare(
            "INSERT INTO events(id,owner,job_id,message,at) VALUES(?,?,?,?,?)",
          )
          .bind(eventId, owner, id, "Enquiry created", at),
      ]);
      return response({ data: await read(owner), id });
    }
    if (a.action === "createTask") {
      const id = crypto.randomUUID();
      await db
        .prepare("INSERT INTO tasks(owner,id,payload) VALUES(?,?,?)")
        .bind(owner, id, JSON.stringify({ ...a.task, id, done: false }))
        .run();
      return response({ data: await read(owner), id });
    }
    if (a.action === "completeTask") {
      const row = await db
        .prepare("SELECT payload FROM tasks WHERE owner=? AND id=?")
        .bind(owner, a.id)
        .first<{ payload: string }>();
      if (!row) return response({ error: "Task not found." }, 404);
      await db
        .prepare("UPDATE tasks SET payload=? WHERE owner=? AND id=?")
        .bind(
          JSON.stringify({ ...JSON.parse(row.payload), done: a.done }),
          owner,
          a.id,
        )
        .run();
      return response({ data: await read(owner) });
    }
    const row = await db
      .prepare("SELECT payload,version FROM jobs WHERE owner=? AND id=?")
      .bind(owner, a.id)
      .first<{ payload: string; version: number }>();
    if (!row) return response({ error: "Job not found." }, 404);
    let job = JSON.parse(row.payload) as Job;
    let message = "";
    if (a.action === "note") {
      await db
        .prepare(
          "INSERT INTO events(id,owner,job_id,message,at) VALUES(?,?,?,?,?)",
        )
        .bind(eventId, owner, a.id, a.text, at)
        .run();
      return response({ data: await read(owner) });
    }
    if (a.version !== row.version)
      return response(
        {
          error: "This job changed in another session. Refresh and try again.",
        },
        409,
      );
    switch (a.action) {
      case "editJob":
        if (a.job.value < job.paid)
          return response(
            { error: "Job value cannot be below payments received." },
            400,
          );
        if (
          stages.indexOf(job.stage) >= 5 &&
          (a.job.value !== job.value ||
            a.job.cost !== job.cost ||
            a.job.category !== job.category ||
            a.job.title !== job.title ||
            a.job.notes !== job.notes)
        )
          return response(
            { error: "Scope and pricing are locked after production starts." },
            400,
          );
        if (
          job.artworkApproved &&
          (a.job.title !== job.title ||
            a.job.category !== job.category ||
            a.job.notes !== job.notes)
        ) {
          job.artworkApproved = false;
          job.approvalReference = undefined;
        }
        job = { ...job, ...a.job };
        message = "Job details updated";
        break;
      case "advance": {
        const error = transitionError(job, a.stage);
        if (error) return response({ error }, 400);
        if (a.stage === "Delivered")
          return response(
            { error: "Record delivery confirmation to complete this handoff." },
            400,
          );
        job.stage = a.stage;
        message = `Moved to ${a.stage}`;
        break;
      }
      case "approveArtwork":
        if (job.stage !== "Design")
          return response(
            { error: "Artwork approval is recorded during Design." },
            400,
          );
        job.artworkApproved = true;
        job.approvalReference = a.reference;
        message = `Artwork approved · ${a.reference}`;
        break;
      case "passQC":
        if (job.stage !== "Quality check")
          return response({ error: "This job is not at quality check." }, 400);
        job.qcPassed = true;
        job.qcNote = a.reference;
        message = `Quality check passed · ${a.reference}`;
        break;
      case "recordDelivery":
        if (job.stage !== "Ready")
          return response(
            { error: "Complete production and QC before delivery." },
            400,
          );
        job.stage = "Delivered";
        job.deliveryReference = a.reference;
        message = `Delivery confirmed · ${a.reference}`;
        break;
      case "payment":
        if (stages.indexOf(job.stage) < 3)
          return response(
            { error: "Confirm the order before recording a payment." },
            400,
          );
        if (job.paid + a.amount > job.value)
          return response(
            { error: "Payment exceeds the outstanding balance." },
            400,
          );
        job.paid += a.amount;
        message = `Payment recorded: INR ${a.amount.toFixed(2)} · ${a.reference}`;
        break;
    }
    const oldVersion = row.version;
    job.version = oldVersion + 1;
    const result = await db.batch([
      db
        .prepare(
          "INSERT INTO events(id,owner,job_id,message,at) SELECT ?,?,?,?,? FROM jobs WHERE owner=? AND id=? AND version=?",
        )
        .bind(eventId, owner, a.id, message, at, owner, a.id, oldVersion),
      db
        .prepare(
          "UPDATE jobs SET payload=?,version=? WHERE owner=? AND id=? AND version=?",
        )
        .bind(JSON.stringify(job), job.version, owner, a.id, oldVersion),
    ]);
    if (!result[1].meta.changes)
      return response(
        { error: "Another update was saved first. Refresh this job." },
        409,
      );
    return response({ data: await read(owner) });
  } catch (error) {
    console.error("Workspace save failed", error);
    return response(
      {
        error:
          "Your change could not be saved. Your input is preserved; please retry.",
      },
      503,
    );
  }
}
