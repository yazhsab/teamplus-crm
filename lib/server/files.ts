import { z } from "zod";
import { config } from "./config";
import { session } from "./session";
import {
  dbError,
  failure,
  HttpError,
  json,
  readJSON,
  sameOrigin,
} from "./http";
const mimeTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "text/plain",
  "application/zip",
] as const;
const inputSchema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("prepareUpload"),
      id: z.string().min(1).max(80),
      name: z
        .string()
        .min(1)
        .max(200)
        .regex(/^[^\x00-\x1f\x7f]+$/),
      size: z.number().int().min(1).max(10485760),
      contentType: z.enum(mimeTypes),
    })
    .strict(),
  z
    .object({ action: z.literal("completeUpload"), id: z.string().uuid() })
    .strict(),
]);
export async function filesPOST(request: Request) {
  try {
    sameOrigin(request);
    const s = await session();
    const id = z
      .string()
      .uuid()
      .safeParse(request.headers.get("idempotency-key"));
    if (!id.success)
      throw new HttpError(400, "A valid request ID is required.");
    const input = inputSchema.safeParse(await readJSON(request, 4000));
    if (!input.success)
      throw new HttpError(
        400,
        "Choose a PDF, PNG, JPEG, WebP, text or ZIP file up to 10 MB.",
      );
    const result = await s.client.rpc("teamplus_command", {
      p_org: s.org,
      p_request_id: id.data,
      p_input: input.data,
    });
    if (result.error) dbError(result.error);
    const fileId = result.data.id as string;
    if (input.data.action === "completeUpload") return json({ id: fileId });
    const path = `${s.org}/${fileId}`;
    const upload = await s.client.storage
      .from("teamplus-files")
      .createSignedUploadUrl(path, { upsert: false });
    if (upload.error) throw new Error("Upload authorization failed.");
    return json({
      id: fileId,
      path,
      token: upload.data.token,
      url: config().SUPABASE_URL,
      key: config().SUPABASE_PUBLISHABLE_KEY,
    });
  } catch (error) {
    return failure(error, "files.write");
  }
}
export async function filesGET(request: Request) {
  try {
    const s = await session();
    const id = z
      .string()
      .uuid()
      .safeParse(new URL(request.url).searchParams.get("id"));
    if (!id.success) throw new HttpError(404, "File not found.");
    const file = await s.client
      .from("attachments")
      .select("id,name")
      .eq("organization_id", s.org)
      .eq("id", id.data)
      .eq("state", "ready")
      .maybeSingle();
    if (file.error) dbError(file.error);
    if (!file.data) throw new HttpError(404, "File not found.");
    const download = await s.client.storage
      .from("teamplus-files")
      .createSignedUrl(`${s.org}/${id.data}`, 60, { download: file.data.name });
    if (download.error) throw new Error("Download unavailable.");
    return new Response(null, {
      status: 303,
      headers: {
        Location: download.data.signedUrl,
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return failure(error, "files.read");
  }
}
