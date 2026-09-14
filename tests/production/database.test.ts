import { PGlite } from "@electric-sql/pglite";
import { readFile, readdir } from "node:fs/promises";
import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const db = new PGlite();
const org = "10000000-0000-4000-8000-000000000001";
const otherOrg = "10000000-0000-4000-8000-000000000002";
const admin = "20000000-0000-4000-8000-000000000001";
const member = "20000000-0000-4000-8000-000000000002";
const viewer = "20000000-0000-4000-8000-000000000003";
const outsider = "20000000-0000-4000-8000-000000000004";
const job = {
  customer: "Test customer",
  contact: "",
  title: "Test signage",
  category: "LED signage",
  value: 10000,
  cost: 5000,
  due: "2026-10-01",
  owner: "Test member",
  source: "Website",
  priority: "Normal",
  notes: "",
};
async function as(user: string) {
  await db.exec("reset role; set role authenticated;");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [user]);
}
async function command(
  input: Record<string, unknown>,
  key = randomUUID(),
  organization = org,
) {
  const result = await db.query<{ result: { id: string } }>(
    "select public.teamplus_command($1,$2,$3::jsonb) as result",
    [organization, key, JSON.stringify(input)],
  );
  return result.rows[0].result;
}
async function snapshot(organization = org) {
  return (
    await db.query<{
      data: {
        jobs: Array<Record<string, string | number | boolean>>;
        tasks: Array<Record<string, string | number | boolean>>;
      };
    }>("select public.teamplus_workspace($1) as data", [organization])
  ).rows[0].data;
}
async function create() {
  await as(admin);
  return (await command({ action: "createJob", job })).id;
}
async function mutate(id: string, action: string, extra = {}) {
  const current = (await snapshot()).jobs.find((j) => j.id === id)!;
  return command({ action, id, version: current.version, ...extra });
}
async function toDesign(id: string) {
  for (const stage of ["Qualified", "Quotation", "Confirmed", "Design"])
    await mutate(id, "advance", { stage });
}

before(async () => {
  // Minimal Supabase-owned schemas are fixtures, not replacements for the actual
  // Auth or Storage services. The migration and RLS execute on real PostgreSQL.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key,email text);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth to authenticated,anon; grant execute on function auth.uid() to authenticated,anon;
    create schema storage; create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text,metadata jsonb,unique(bucket_id,name));
    alter table storage.objects enable row level security; grant usage on schema storage to authenticated; grant select,insert,update,delete on storage.objects to authenticated;
  `);
  const migrations = new URL("../../supabase/migrations/", import.meta.url);
  for (const name of (await readdir(migrations))
    .filter((n) => n.endsWith(".sql"))
    .sort())
    await db.exec(await readFile(new URL(name, migrations), "utf8"));
  await db.query(
    "insert into auth.users values($1,$2),($3,$4),($5,$6),($7,$8)",
    [
      admin,
      "admin@test.invalid",
      member,
      "member@test.invalid",
      viewer,
      "viewer@test.invalid",
      outsider,
      "outsider@test.invalid",
    ],
  );
  await db.query(
    "insert into public.organizations(id,name) values($1,$2),($3,$4)",
    [org, "TeamPlus test", otherOrg, "Other tenant"],
  );
  await db.query(
    "insert into public.memberships values($1,$2,'admin'),($1,$3,'member'),($1,$4,'viewer'),($5,$6,'admin')",
    [org, admin, member, viewer, otherOrg, outsider],
  );
});
after(async () => {
  await db.close();
});

test("production starts with empty data", async () => {
  await as(admin);
  assert.equal((await snapshot()).jobs.length, 0);
});
test("anonymous callers cannot authorize SQL", async () => {
  await db.exec("reset role; set role anon;");
  await assert.rejects(() => snapshot(), /permission denied/);
  await assert.rejects(
    () => command({ action: "createJob", job }),
    /permission denied/,
  );
});
test("same team shares jobs; other tenants cannot read or mutate them", async () => {
  const id = await create();
  await as(member);
  assert.ok((await snapshot()).jobs.some((j) => j.id === id));
  await as(outsider);
  assert.equal((await db.query("select * from public.jobs")).rows.length, 0);
  await assert.rejects(() => snapshot(org), /access is not assigned/);
  await assert.rejects(
    () => command({ action: "note", id, text: "cross tenant" }),
    /permission/,
  );
  await assert.rejects(
    () =>
      command(
        { action: "note", id, text: "cross tenant" },
        randomUUID(),
        otherOrg,
      ),
    /not found/,
  );
});
test("viewers cannot write and direct table DML cannot bypass workflow rules", async () => {
  await as(viewer);
  await assert.rejects(
    () => command({ action: "createJob", job }),
    /permission/,
  );
  await as(admin);
  await assert.rejects(
    () => db.query("update public.jobs set paid=value"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("delete from public.events"),
    /permission denied/,
  );
  await assert.rejects(
    () => db.query("update public.memberships set role='admin'"),
    /permission denied/,
  );
});
test("database rejects malformed dates, missing fields, fractional amounts and invalid categories", async () => {
  await as(admin);
  for (const invalid of [
    { due: "2026-02-30" },
    { value: 1.5 },
    { customer: "" },
    { category: "arbitrary" },
    { value: -1 },
    { due: "1999-01-01" },
  ])
    await assert.rejects(() =>
      command({ action: "createJob", job: { ...job, ...invalid } }),
    );
});
test("idempotency replays the same result and rejects key reuse with different data", async () => {
  await as(admin);
  const key = randomUUID();
  const input = { action: "createJob", job };
  const first = await command(input, key);
  assert.deepEqual(await command(input, key), first);
  assert.equal(
    (await snapshot()).jobs.filter((j) => j.id === first.id).length,
    1,
  );
  await assert.rejects(
    () =>
      command(
        { action: "createJob", job: { ...job, title: "Different title" } },
        key,
      ),
    /already used/,
  );
});
test("workflow enforces approvals, scope invalidation, QC, delivery and payment closure", async () => {
  const id = await create();
  await assert.rejects(
    () => mutate(id, "advance", { stage: "Confirmed" }),
    /one stage/,
  );
  await toDesign(id);
  await assert.rejects(
    () => mutate(id, "advance", { stage: "Production" }),
    /artwork approval/,
  );
  await mutate(id, "approveArtwork", {
    reference: "Customer email revision 1",
  });
  await mutate(id, "editJob", { job: { ...job, title: "Changed scope" } });
  await assert.rejects(
    () => mutate(id, "advance", { stage: "Production" }),
    /artwork approval/,
  );
  await mutate(id, "approveArtwork", {
    reference: "Customer email revision 2",
  });
  await mutate(id, "advance", { stage: "Production" });
  await assert.rejects(() => mutate(id, "editJob", { job }), /locked/);
  await mutate(id, "advance", { stage: "Quality check" });
  await assert.rejects(
    () => mutate(id, "advance", { stage: "Ready" }),
    /quality check/,
  );
  await mutate(id, "passQC", {
    reference: "Dimensions and illumination verified",
  });
  await mutate(id, "advance", { stage: "Ready" });
  await assert.rejects(
    () => mutate(id, "advance", { stage: "Delivered" }),
    /delivery confirmation/,
  );
  await mutate(id, "recordDelivery", { reference: "Customer signed handoff" });
  await assert.rejects(
    () => mutate(id, "advance", { stage: "Paid" }),
    /outstanding payment/,
  );
  await mutate(id, "payment", { amount: 10000, reference: "BANK-1001" });
  await mutate(id, "advance", { stage: "Paid" });
  assert.equal((await snapshot()).jobs.find((j) => j.id === id)!.stage, "Paid");
});
test("stale writes cannot double-apply payments; retries cannot duplicate ledger or activity", async () => {
  const id = await create();
  await toDesign(id);
  const version = Number(
    (await snapshot()).jobs.find((j) => j.id === id)!.version,
  );
  const key = randomUUID();
  const payment = {
    action: "payment",
    id,
    version,
    amount: 3000,
    reference: "BANK-RETRY",
  };
  await command(payment, key);
  await command(payment, key);
  const concurrent = await Promise.allSettled([
    command({ ...payment, version: version + 1, reference: "BANK-A" }),
    command({ ...payment, version: version + 1, reference: "BANK-B" }),
  ]);
  assert.equal(concurrent.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal((await snapshot()).jobs.find((j) => j.id === id)!.paid, 6000);
  await assert.rejects(
    () => mutate(id, "payment", { amount: 5000, reference: "OVERPAY" }),
    /balance/,
  );
  assert.equal(
    (await db.query("select * from public.payments where job_id=$1", [id])).rows
      .length,
    2,
  );
  assert.equal(
    (
      await db.query(
        "select * from public.events where job_id=$1 and action='payment'",
        [id],
      )
    ).rows.length,
    2,
  );
  await as(member);
  await assert.rejects(
    () => mutate(id, "payment", { amount: 1000, reference: "UNAUTHORIZED" }),
    /managers/,
  );
});
test("tasks use versions and command idempotency", async () => {
  await as(admin);
  const { id } = await command({
    action: "createTask",
    task: {
      title: "Call customer",
      customer: "Test customer",
      due: "2026-10-01",
      time: "10:30",
    },
  });
  await command({ action: "completeTask", id, done: true, version: 1 });
  await assert.rejects(
    () => command({ action: "completeTask", id, done: false, version: 1 }),
    /task changed/,
  );
  assert.equal((await snapshot()).tasks.find((t) => t.id === id)!.done, true);
});
test("storage policies bind objects to tenant, job, uploader and finalized metadata", async () => {
  const id = await create();
  const { id: fileId } = await command({
    action: "prepareUpload",
    id,
    name: "proof.pdf",
    size: 12,
    contentType: "application/pdf",
  });
  const name = `${org}/${fileId}`;
  await as(member);
  await assert.rejects(
    () =>
      db.query(
        "insert into storage.objects(bucket_id,name,metadata) values('teamplus-files',$1,$2)",
        [name, JSON.stringify({ size: 12, mimetype: "application/pdf" })],
      ),
    /row-level security/,
  );
  await as(admin);
  await assert.rejects(
    () => command({ action: "completeUpload", id: fileId }),
    /incomplete/,
  );
  await db.query(
    "insert into storage.objects(bucket_id,name,metadata) values('teamplus-files',$1,$2)",
    [name, JSON.stringify({ size: 12, mimetype: "application/pdf" })],
  );
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await command({ action: "completeUpload", id: fileId });
  await as(viewer);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    1,
  );
  await as(outsider);
  assert.equal(
    (await db.query("select * from storage.objects")).rows.length,
    0,
  );
  await as(admin);
  await db.query("update storage.objects set metadata='{}' where name=$1", [
    name,
  ]);
  assert.equal(
    (
      await db.query<{ metadata: { size: number } }>(
        "select metadata from storage.objects where name=$1",
        [name],
      )
    ).rows[0].metadata.size,
    12,
  );
});
test("last admin is protected; membership removal takes effect immediately", async () => {
  await as(admin);
  await assert.rejects(
    () => command({ action: "setMember", userId: admin, role: "remove" }),
    /one administrator/,
  );
  await command({ action: "setMember", userId: viewer, role: "remove" });
  await as(viewer);
  await assert.rejects(() => snapshot(), /access is not assigned/);
});

test('administrator-only account listing and bootstrap cannot be called by members', async () => {
  await as(member);
  await assert.rejects(() => db.query('select * from public.teamplus_members($1)', [org]), /administrators/);
  await assert.rejects(() => db.query('select public.teamplus_bootstrap($1,$2,$3)', [org,'Hijack',member]), /permission denied/);
  await as(admin);
  assert.equal((await db.query('select * from public.teamplus_members($1)', [org])).rows.length, 2);
});

test('abandoned upload cleanup cannot race finalization or affect completed files', async () => {
  const id=await create();
  const {id:fileId}=await command({action:'prepareUpload',id,name:'unfinished.pdf',size:10,contentType:'application/pdf'});
  await db.exec('reset role');
  await db.query("update public.attachments set at=now()-interval '2 days' where id=$1",[fileId]);
  await db.query("insert into storage.objects(bucket_id,name,metadata) values('teamplus-files',$1,$2)",[`${org}/${fileId}`,JSON.stringify({size:10,mimetype:'application/pdf'})]);
  await db.exec('set role service_role');
  const claimed=await db.query<{id:string}>('select * from public.teamplus_claim_abandoned_uploads($1)',[org]);
  assert.deepEqual(claimed.rows.map(r=>r.id),[fileId]);
  await as(admin);
  await assert.rejects(()=>command({action:'completeUpload',id:fileId}),/expired/);
  assert.equal((await db.query('select * from storage.objects where name=$1',[`${org}/${fileId}`])).rows.length,0);
});
