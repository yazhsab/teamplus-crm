import { env } from "cloudflare:workers";
export function database() {
  if (!env.DB)
    throw new Error("Database is unavailable. Please retry shortly.");
  return env.DB;
}
export function bucket() {
  if (!env.BUCKET)
    throw new Error("File storage is unavailable. Please retry shortly.");
  return env.BUCKET;
}
