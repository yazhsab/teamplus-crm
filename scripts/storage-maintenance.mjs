// Dry run by default. Only incomplete uploads older than 24h are eligible.
import { createClient } from "@supabase/supabase-js";
import { validateEnvironment } from "./validate-env.mjs";
validateEnvironment();
if (!process.env.SUPABASE_SERVICE_ROLE_KEY)
  throw new Error("Set the operator service key in your shell.");
const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const org = process.env.TEAMPLUS_ORGANIZATION_ID;
const rows = await client
  .from("attachments")
  .select("id")
  .eq("organization_id", org)
  .eq("state", "pending")
  .lt("at", new Date(Date.now() - 86400000).toISOString())
  .order("at")
  .limit(100);
if (rows.error) throw new Error("Could not list incomplete uploads.");
if (!process.argv.includes("--apply"))
  console.log(
    `${rows.data.length} incomplete uploads eligible. Re-run with --apply to remove them (up to 100 per run).`,
  );
else {
  const claimed = await client.rpc("teamplus_claim_abandoned_uploads", {
    p_org: org,
  });
  if (claimed.error) throw new Error("Could not claim incomplete uploads.");
  for (const row of claimed.data) {
    const removed = await client.storage
      .from("teamplus-files")
      .remove([`${org}/${row.id}`]);
    if (removed.error)
      throw new Error("Storage cleanup failed; metadata retained.");
    const deleted = await client
      .from("attachments")
      .delete()
      .eq("organization_id", org)
      .eq("id", row.id)
      .eq("state", "deleting");
    if (deleted.error)
      throw new Error("Metadata cleanup failed. Retry safely.");
  }
  console.log(`Removed ${claimed.data.length} incomplete uploads.`);
}
