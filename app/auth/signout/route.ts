import { supabaseServer } from "@/lib/supabase/server";
import { config } from "@/lib/server/config";
import { failure, sameOrigin } from "@/lib/server/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const client = await supabaseServer();
    const { error } = await client.auth.signOut();
    if (error) throw new Error("Sign out failed.");
    return new Response(null, {
      status: 303,
      headers: {
        Location: `${config().APP_URL}/login`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return failure(error, "auth.signout");
  }
}
