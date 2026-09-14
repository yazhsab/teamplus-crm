import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, bucket } from "@/db";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return new Response("Sign in required", { status: 401 });
  try {
    const id = new URL(request.url).searchParams.get("id");
    const file = await database()
      .prepare("SELECT * FROM files WHERE id=? AND owner=?")
      .bind(id, user.userId)
      .first<{ id: string; name: string; content_type: string }>();
    if (!file) return new Response("File not found", { status: 404 });
    const object = await bucket().get(`${user.userId}/${file.id}`);
    if (!object) return new Response("File unavailable", { status: 404 });
    return new Response(object.body, {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("File could not be retrieved", { status: 503 });
  }
}
export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user)
    return Response.json({ error: "Sign in required" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin)
    return Response.json({ error: "Invalid origin" }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 11 * 1024 * 1024)
    return Response.json(
      { error: "Files must be 10 MB or smaller." },
      { status: 413 },
    );
  try {
    const form = await request.formData();
    const file = form.get("file");
    const jobId = form.get("jobId");
    if (
      !(file instanceof File) ||
      typeof jobId !== "string" ||
      file.size > 10 * 1024 * 1024 ||
      file.size === 0
    )
      return Response.json(
        { error: "Choose a non-empty file up to 10 MB." },
        { status: 400 },
      );
    const job = await database()
      .prepare("SELECT id FROM jobs WHERE owner=? AND id=?")
      .bind(user.userId, jobId)
      .first();
    if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
    const id = crypto.randomUUID(),
      key = `${user.userId}/${id}`,
      at = new Date().toISOString();
    await bucket().put(key, await file.arrayBuffer());
    try {
      await database().batch([
        database()
          .prepare(
            "INSERT INTO files(id,owner,job_id,name,size,content_type,at) VALUES(?,?,?,?,?,?,?)",
          )
          .bind(
            id,
            user.userId,
            jobId,
            file.name.slice(0, 200),
            file.size,
            file.type,
            at,
          ),
        database()
          .prepare(
            "INSERT INTO events(id,owner,job_id,message,at) VALUES(?,?,?,?,?)",
          )
          .bind(
            crypto.randomUUID(),
            user.userId,
            jobId,
            `File added: ${file.name.slice(0, 200)}`,
            at,
          ),
      ]);
    } catch (error) {
      await bucket().delete(key);
      throw error;
    }
    return Response.json({ id });
  } catch (error) {
    console.error("Upload failed", error);
    return Response.json(
      { error: "Upload failed. Please retry." },
      { status: 503 },
    );
  }
}
