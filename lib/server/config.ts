import "server-only";
import { z } from "zod";

const schema = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20)
    .refine((key) => {
      if (key.startsWith("sb_publishable_")) return true;
      try {
        return (
          JSON.parse(
            atob(key.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
          ).role === "anon"
        );
      } catch {
        return false;
      }
    }, "Use a publishable or anon key."),
  TEAMPLUS_ORGANIZATION_ID: z.string().uuid(),
  APP_URL: z.string().url(),
});
export function config() {
  const result = schema.safeParse(process.env);
  if (!result.success)
    throw new Error("Production configuration is missing or invalid.");
  const c = result.data;
  for (const address of [c.APP_URL, c.SUPABASE_URL]) {
    const url = new URL(address);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (url.username || url.password || (!local && url.protocol !== "https:"))
      throw new Error("Use HTTPS for production services.");
  }
  if (
    new URL(c.APP_URL).pathname !== "/" ||
    new URL(c.APP_URL).search ||
    new URL(c.APP_URL).hash
  )
    throw new Error("APP_URL must be an origin.");
  return c;
}
