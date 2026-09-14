// Operator-only CLI. Never bundle the service key into an app or client.
import { createClient } from "@supabase/supabase-js";
import { validateEnvironment } from "./validate-env.mjs";
validateEnvironment();
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!secret)
  throw new Error(
    "Provide SUPABASE_SERVICE_ROLE_KEY only in the operator shell.",
  );
const client = createClient(process.env.SUPABASE_URL, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const org = process.env.TEAMPLUS_ORGANIZATION_ID;
const [command, ...args] = process.argv.slice(2);
if (command === "bootstrap") {
  const [adminId, name = "TeamPlus"] = args;
  if (!/^[0-9a-f-]{36}$/i.test(adminId || ""))
    throw new Error(
      'Usage: npm run team:admin -- bootstrap EXISTING_AUTH_USER_UUID "TeamPlus"',
    );
  const result = await client.rpc("teamplus_bootstrap", {
    p_org: org,
    p_name: name,
    p_admin: adminId,
  });
  if (result.error)
    throw new Error("Bootstrap failed. Check the user UUID and migrations.");
  console.log("Workspace ready:", result.data);
} else if (command === "invite") {
  const [email, role = "member"] = args;
  if (
    !email?.includes("@") ||
    !["admin", "manager", "member", "viewer"].includes(role)
  )
    throw new Error("Usage: npm run team:admin -- invite EMAIL ROLE");
  const workspace = await client
    .from("organizations")
    .select("id")
    .eq("id", org)
    .single();
  if (workspace.error) throw new Error("Bootstrap the workspace first.");
  const result = await client.auth.admin.inviteUserByEmail(email, {
    redirectTo: process.env.APP_URL + "/auth/confirm",
  });
  if (result.error || !result.data.user)
    throw new Error(
      "Invitation failed. Check SMTP, address and whether the account already exists.",
    );
  const membership = await client
    .from("memberships")
    .insert({ organization_id: org, user_id: result.data.user.id, role });
  if (membership.error)
    throw new Error(
      `Invitation was sent, but access assignment failed. Use the Supabase dashboard to assign user ${result.data.user.id} to workspace ${org}. Do not resend the invitation.`,
    );
  console.log("Invitation sent and team access assigned.");
} else
  throw new Error(
    "Use bootstrap or invite. Existing roles can be changed in Workspace → Connections.",
  );
