import { spawn } from "node:child_process";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";
const port = 4317;
const base = `http://127.0.0.1:${port}`;
const child = spawn(
  process.execPath,
  [".next-production/standalone/server.js"],
  {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      HOSTNAME: "127.0.0.1",
      APP_URL: base,
      SUPABASE_URL: "http://127.0.0.1:54321",
      SUPABASE_PUBLISHABLE_KEY: "sb_publishable_http_test_only_not_a_real_key",
      TEAMPLUS_ORGANIZATION_ID: "10000000-0000-4000-8000-000000000001",
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
for (const stream of [child.stdout, child.stderr])
  stream.on("data", (chunk) => {
    output = (output + chunk.toString()).slice(-6000);
  });
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error("Server exited: " + output);
    try {
      const r = await fetch(base + "/api/health");
      if (r.status === 200) {
        ready = true;
        break;
      }
    } catch {}
    await delay(200);
  }
  assert.ok(ready, "Standalone server must start");
  const login = await fetch(base + "/login");
  assert.equal(login.status, 200);
  const html = await login.text();
  assert.match(html, /Sign in/);
  const csp = login.headers.get("content-security-policy");
  assert.ok(csp?.includes("frame-ancestors 'none'"));
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce && html.includes(`nonce="${nonce}"`), "CSP nonce must match the rendered scripts");
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.ok(!csp.includes("script-src 'self' 'unsafe-inline'"));
  assert.equal(login.headers.get("x-content-type-options"), "nosniff");
  assert.equal(login.headers.get("x-frame-options"), "DENY");
  assert.match(login.headers.get("cache-control"), /no-store/);
  assert.equal(login.headers.get("x-powered-by"), null);
  const asset = html.match(/src="([^\"]*\/_next\/static\/[^\"]+\.js)"/);
  assert.ok(asset, "Login has a client bundle");
  assert.equal((await fetch(base + asset[1])).status, 200);
  const home = await fetch(base + "/", { redirect: "manual" });
  assert.equal(home.status, 307);
  assert.equal(home.headers.get("location"), "/login");
  for (const route of [
    "/api/workspace",
    "/api/files?id=10000000-0000-4000-8000-000000000001",
  ]) {
    const response = await fetch(base + route, {
      headers: {
        Cookie: "__sites_local_auth=1",
        "oai-authenticated-user-id": "local_seedy",
        "oai-authenticated-user-email": "seedy@sites.test",
      },
    });
    assert.equal(response.status, 401, route + " rejects preview credentials");
    assert.match(response.headers.get("cache-control"), /no-store/);
  }
  const crossSite = await fetch(base + "/api/workspace", {
    method: "POST",
    headers: {
      Origin: "https://untrusted.example",
      "Content-Type": "application/json",
    },
    body: "{}",
  });
  assert.equal(crossSite.status, 403);
  for (const [body, status] of [
    ["{", 400],
    ['{"action":"unknown"}', 400],
    ["x".repeat(5000), 413],
  ]) {
    const r = await fetch(base + "/auth/session", {
      method: "POST",
      headers: { Origin: base, "Content-Type": "application/json" },
      body,
    });
    assert.equal(r.status, status);
  }
  const wrongContentType = await fetch(base + "/auth/session", {
    method: "POST",
    headers: { Origin: base, "Content-Type": "text/plain" },
    body: "{}",
  });
  assert.equal(wrongContentType.status, 415);
  const badLink = await fetch(
    base +
      "/auth/confirm?token_hash=invalid&type=signup&next=https://untrusted.example",
    { redirect: "manual" },
  );
  assert.equal(badLink.status, 307);
  assert.equal(new URL(badLink.headers.get("location")).origin, base);
  console.log(
    "Standalone HTTP checks passed: page, static assets, security headers, private cache, login redirect, demo-auth rejection, CSRF, bounded JSON, invalid links.",
  );
} finally {
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), delay(5000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
}
