import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
export function validateEnvironment() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development");
  const required = [
    "APP_URL",
    "SUPABASE_URL",
    "SUPABASE_PUBLISHABLE_KEY",
    "TEAMPLUS_ORGANIZATION_ID",
  ];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length)
    throw new Error(
      `Set ${missing.join(", ")}. See .env.example and docs/DEPLOYMENT.md.`,
    );
  for (const key of ["APP_URL", "SUPABASE_URL"]) {
    const url = new URL(process.env[key]);
    if (
      url.username ||
      url.password ||
      (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
        url.protocol !== "https:")
    )
      throw new Error(`${key} must use HTTPS outside localhost.`);
  }
  const app = new URL(process.env.APP_URL);
  if (app.pathname !== "/" || app.search || app.hash)
    throw new Error("APP_URL must be an origin without a path.");
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      process.env.TEAMPLUS_ORGANIZATION_ID,
    )
  )
    throw new Error("TEAMPLUS_ORGANIZATION_ID must be a UUID.");
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  let valid = key.startsWith("sb_publishable_") && key.length > 20;
  if (!valid) {
    try {
      valid =
        JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString())
          .role === "anon";
    } catch {}
  }
  if (!valid)
    throw new Error(
      "Use a Supabase publishable or legacy anon key, never a service role key.",
    );
}
if (process.argv[1]?.endsWith("validate-env.mjs")) {
  try {
    validateEnvironment();
    console.log("Production environment validated.");
  } catch (e) {
    console.error(e.message);
    process.exitCode = 1;
  }
}
