import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { config } from "./config";
import { HttpError, dbError } from "./http";
export type Role = "admin" | "manager" | "member" | "viewer";
export async function session() {
  const client = await supabaseServer();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    if (error && error.status && error.status >= 500)
      throw new Error("Authentication is unavailable.");
    throw new HttpError(401, "Your session expired. Sign in again.");
  }
  const org = config().TEAMPLUS_ORGANIZATION_ID;
  const membership = await client
    .from("memberships")
    .select("role")
    .eq("organization_id", org)
    .eq("user_id", data.user.id)
    .maybeSingle();
  if (membership.error) dbError(membership.error);
  if (!membership.data)
    throw new HttpError(
      403,
      "Workspace access is not assigned. Contact your administrator.",
    );
  return { client, org, user: data.user, role: membership.data.role as Role };
}
export async function requireWorkspacePage() {
  try {
    await session();
  } catch (error) {
    if (error instanceof HttpError && error.status === 401) redirect("/login");
    if (error instanceof HttpError && error.status === 403)
      redirect("/login?access=denied");
    throw error;
  }
  return "production" as const;
}
