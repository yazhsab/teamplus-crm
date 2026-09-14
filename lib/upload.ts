import type { MutableRefObject } from "react";
export type UploadAttempt = {
  fingerprint: string;
  prepareId: string;
  completeId: string;
  prepared?: {
    id: string;
    path: string;
    token: string;
    url: string;
    key: string;
  };
  uploaded?: boolean;
};
export async function uploadJobFile(
  file: File,
  jobId: string,
  ref: MutableRefObject<UploadAttempt | null>,
) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  const fingerprint = `${jobId}:${file.name}:${file.type}:${Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("")}`;
  if (ref.current?.fingerprint !== fingerprint)
    ref.current = {
      fingerprint,
      prepareId: crypto.randomUUID(),
      completeId: crypto.randomUUID(),
    };
  const attempt = ref.current;
  async function send(body: unknown, key: string) {
    const r = await fetch("/api/files", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": key },
      body: JSON.stringify(body),
    });
    const data = (await r.json()) as NonNullable<UploadAttempt["prepared"]> & {
      error?: string;
    };
    if (!r.ok) throw new Error(data.error || "Upload failed. Please retry.");
    return data;
  }
  attempt.prepared ??= await send(
    {
      action: "prepareUpload",
      id: jobId,
      name: file.name,
      size: file.size,
      contentType: file.type,
    },
    attempt.prepareId,
  );
  const p = attempt.prepared!;
  if (!attempt.uploaded) {
    const { createClient } = await import("@supabase/supabase-js");
    const client = createClient(p.url, p.key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
    const upload = await client.storage
      .from("teamplus-files")
      .uploadToSignedUrl(p.path, p.token, file, { contentType: file.type });
    // A lost success response can leave the immutable object present. The
    // finalize RPC verifies the stored size and MIME before exposing it.
    if (
      upload.error &&
      String(upload.error.statusCode) !== "409" &&
      upload.error.message !== "The resource already exists"
    ) {
      attempt.prepared = undefined;
      throw new Error("File transfer failed. Select the same file to retry.");
    }
    attempt.uploaded = true;
  }
  await send({ action: "completeUpload", id: p.id }, attempt.completeId);
  ref.current = null;
}
