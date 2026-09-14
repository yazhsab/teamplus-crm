import { AuthForm } from "@/components/auth-form";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
export const dynamic = "force-dynamic";
export default async function ResetPassword() {
  const client = await supabaseServer();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) redirect("/login?link=expired");
  return <AuthForm changePassword />;
}
