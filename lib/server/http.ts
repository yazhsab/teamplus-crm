import { config } from "./config";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
export function sameOrigin(request: Request) {
  if (request.headers.get("origin") !== new URL(config().APP_URL).origin)
    throw new HttpError(403, "This request must come from the workspace.");
}
export async function readJSON(request: Request, maxBytes = 50000) {
  if (
    !request.headers
      .get("content-type")
      ?.toLowerCase()
      .startsWith("application/json")
  )
    throw new HttpError(415, "Send JSON data.");
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new HttpError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body is missing.");
  let size = 0;
  const parts: Uint8Array[] = [];
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new HttpError(413, "Request is too large.");
      }
      parts.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const part of parts) {
      bytes.set(part, offset);
      offset += part.byteLength;
    }
    try {
      return JSON.parse(
        new TextDecoder("utf-8", { fatal: true }).decode(bytes),
      ) as unknown;
    } catch {
      throw new HttpError(400, "Invalid JSON.");
    }
  } finally {
    reader.releaseLock();
  }
}
export function dbError(error: { code?: string; message?: string }): never {
  if (error.code === "42501")
    throw new HttpError(403, error.message || "Permission denied.");
  if (error.code === "PT409")
    throw new HttpError(409, error.message || "Refresh and retry.");
  if (error.code === "PT404") throw new HttpError(404, "Record not found.");
  if (error.code === "PT429")
    throw new HttpError(429, "Too many changes. Wait a minute and try again.");
  if (error.code === "22023")
    throw new HttpError(400, error.message || "Check the entered values.");
  if (error.code?.startsWith("22") || error.code?.startsWith("23"))
    throw new HttpError(400, "Check the values, dates, and required fields.");
  throw new Error("Database operation failed.");
}
export function failure(error: unknown, operation: string) {
  if (error instanceof HttpError)
    return json({ error: error.message }, error.status);
  const requestId = crypto.randomUUID();
  // Do not log customer data, credentials, request bodies or raw provider errors.
  console.error(JSON.stringify({ level: "error", operation, requestId }));
  return json(
    { error: "The service is unavailable. Please retry.", requestId },
    503,
  );
}
