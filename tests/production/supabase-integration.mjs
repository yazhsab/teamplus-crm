// Full local integration: real Supabase Auth, PostgREST, PostgreSQL, Storage and
// the standalone Next server. Refuses non-loopback services; creates test data only.
import { createClient } from "@supabase/supabase-js";
import { execFileSync, spawn } from "node:child_process";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import assert from "node:assert/strict";
const status = JSON.parse(
  execFileSync("node_modules/.bin/supabase", ["status", "-o", "json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }),
);
const url = status.API_URL;
if (!["127.0.0.1", "localhost"].includes(new URL(url).hostname))
  throw new Error("Integration tests only run against local Supabase.");
const key = status.PUBLISHABLE_KEY || status.ANON_KEY;
const secret = status.SECRET_KEY || status.SERVICE_ROLE_KEY;
const adminClient = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const org = randomUUID();
const app = "http://127.0.0.1:4318";
const users = [];
const uploaded = [];
const child = spawn(
  process.execPath,
  [".next-production/standalone/server.js"],
  {
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: "4318",
      HOSTNAME: "127.0.0.1",
      APP_URL: app,
      SUPABASE_URL: url,
      SUPABASE_PUBLISHABLE_KEY: key,
      TEAMPLUS_ORGANIZATION_ID: org,
    },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let output = "";
for (const stream of [child.stdout, child.stderr])
  stream.on("data", (x) => {
    output = (output + x.toString()).slice(-6000);
  });
const password = "Integration-" + randomUUID();
function check(result) {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}
async function makeUser(role) {
  const email = `teamplus-${role}-${randomUUID()}@example.test`;
  const data = check(
    await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    }),
  );
  users.push(data.user.id);
  return { id: data.user.id, email };
}
async function login(email) {
  const r = await fetch(app + "/auth/session", {
    method: "POST",
    headers: { Origin: app, "Content-Type": "application/json" },
    body: JSON.stringify({ action: "login", email, password }),
  });
  assert.equal(r.status, 200, await r.text());
  const set = r.headers.getSetCookie();
  assert.ok(
    set.some((c) => /httponly/i.test(c)),
    "Session cookies must be HttpOnly",
  );
  return set.map((c) => c.split(";")[0]).join("; ");
}
async function api(path, cookie, body, key = randomUUID()) {
  return fetch(app + path, {
    method: body ? "POST" : "GET",
    headers: {
      Cookie: cookie,
      Origin: app,
      "Content-Type": "application/json",
      "Idempotency-Key": key,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
}
async function data(r, code = 200) {
  const payload = await r.json();
  assert.equal(r.status, code, JSON.stringify(payload));
  return payload;
}
try {
  let ready = false;
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(app + "/api/health")).ok) {
        ready = true;
        break;
      }
    } catch {}
    await delay(200);
  }
  assert.ok(ready);
  const admin = await makeUser("admin");
  const member = await makeUser("member");
  const outsider = await makeUser("outsider");
  check(
    await adminClient.rpc("teamplus_bootstrap", {
      p_org: org,
      p_admin: admin.id,
      p_name: "Disposable integration team",
    }),
  );
  check(
    await adminClient
      .from("memberships")
      .insert({ organization_id: org, user_id: member.id, role: "member" }),
  );
  const cookie = await login(admin.email);
  const memberCookie = await login(member.email);
  const outsiderCookie = await login(outsider.email);
  await data(await api("/api/workspace", outsiderCookie), 403);
  const empty = await data(await api("/api/workspace", cookie));
  assert.equal(empty.jobs.length, 0);
  assert.equal(empty.user.role, "admin");
  const payload = {
    action: "createJob",
    job: {
      customer: "Integration customer",
      contact: "",
      title: "Integration signage",
      category: "LED signage",
      value: 10000,
      cost: 5000,
      due: "2026-10-01",
      owner: "Test owner",
      source: "Website",
      priority: "Normal",
      notes: "",
    },
  };
  const requestId = randomUUID();
  const created = await data(
    await api("/api/workspace", cookie, payload, requestId),
  );
  const id = created.id;
  const replay = await data(
    await api("/api/workspace", cookie, payload, requestId),
  );
  assert.equal(replay.id, id);
  assert.equal(replay.data.jobs.length, 1);
  assert.equal(
    (await data(await api("/api/workspace", memberCookie))).jobs[0].id,
    id,
  );
  const bad = await api("/api/workspace", cookie, {
    action: "note",
    id,
    text: "x".repeat(55000),
  });
  await data(bad, 413);
  let version = 1;
  for (const stage of ["Qualified", "Quotation", "Confirmed"]) {
    await data(
      await api("/api/workspace", cookie, {
        action: "advance",
        id,
        version,
        stage,
      }),
    );
    version++;
  }
  await data(
    await api("/api/workspace", memberCookie, {
      action: "payment",
      id,
      version,
      amount: 1000,
      reference: "BANK-1",
    }),
    403,
  );
  const paymentId = randomUUID();
  const payment = {
    action: "payment",
    id,
    version,
    amount: 1000,
    reference: "BANK-1",
  };
  await data(await api("/api/workspace", cookie, payment, paymentId));
  await data(await api("/api/workspace", cookie, payment, paymentId));
  assert.equal(
    (await data(await api("/api/workspace", cookie))).jobs[0].paid,
    1000,
  );
  await data(
    await api("/api/workspace", cookie, { ...payment, reference: "BANK-2" }),
    409,
  );
  const blob = new Blob(["%PDF-1.4\nLocal integration test\n%%EOF"], {
    type: "application/pdf",
  });
  const prepared = await data(
    await api("/api/files", cookie, {
      action: "prepareUpload",
      id,
      name: "integration.pdf",
      size: blob.size,
      contentType: blob.type,
    }),
  );
  uploaded.push(prepared.path);
  const uploader = createClient(prepared.url, prepared.key, {
    auth: { persistSession: false },
  });
  check(
    await uploader.storage
      .from("teamplus-files")
      .uploadToSignedUrl(prepared.path, prepared.token, blob, {
        contentType: blob.type,
      }),
  );
  await data(
    await api("/api/files", cookie, {
      action: "completeUpload",
      id: prepared.id,
    }),
  );
  const download = await api("/api/files?id=" + prepared.id, memberCookie);
  assert.equal(download.status, 303);
  const file = await fetch(download.headers.get("location"));
  assert.equal(file.status, 200);
  assert.match(file.headers.get("content-disposition"), /attachment/);
  assert.equal(await file.text(), await blob.text());
  await data(await api("/api/files?id=" + prepared.id, outsiderCookie), 403);
  assert.equal((await data(await api("/api/team", cookie))).members.length, 2);
  await data(await api("/api/team", memberCookie), 403);
  await data(
    await api("/api/team", cookie, { userId: member.id, role: "remove" }),
  );
  await data(await api("/api/workspace", memberCookie), 403);
  // Redeem a real Auth recovery token against the server callback. No email sent.
  const recovery = check(
    await adminClient.auth.admin.generateLink({
      type: "recovery",
      email: admin.email,
    }),
  );
  const confirm = await fetch(
    app +
      "/auth/confirm?type=recovery&token_hash=" +
      encodeURIComponent(recovery.properties.hashed_token),
    { redirect: "manual" },
  );
  assert.equal(confirm.status, 307);
  assert.equal(
    new URL(confirm.headers.get("location")).pathname,
    "/reset-password",
  );
  const recoveredCookie = confirm.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const reset = await fetch(app + "/auth/session", {
    method: "POST",
    headers: {
      Origin: app,
      Cookie: recoveredCookie,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      action: "password",
      password: "Updated-" + randomUUID(),
    }),
  });
  await data(reset);
  const signout = await fetch(app + "/auth/signout", {
    method: "POST",
    headers: { Origin: app, Cookie: recoveredCookie },
    redirect: "manual",
  });
  assert.equal(signout.status, 303);
  console.log(
    "Real Supabase integration passed: cookie sign-in, membership isolation, shared records, mutation idempotency, bounded requests, payments, signed upload/download bytes, team access revocation, recovery callback and password change.",
  );
} finally {
  child.kill("SIGTERM");
  await Promise.race([once(child, "exit"), delay(5000)]);
  if (child.exitCode === null) child.kill("SIGKILL");
  if (uploaded.length)
    await adminClient.storage.from("teamplus-files").remove(uploaded);
  for (const table of [
    "attachments",
    "payments",
    "events",
    "tasks",
    "jobs",
    "memberships",
  ])
    await adminClient.from(table).delete().eq("organization_id", org);
  await adminClient.from("organizations").delete().eq("id", org);
  for (const id of users) await adminClient.auth.admin.deleteUser(id);
}
