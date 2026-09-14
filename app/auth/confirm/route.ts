import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { config } from "@/lib/server/config";
export async function GET(request: Request) {
  const query = new URL(request.url).searchParams;
  const hash = query.get("token_hash");
  const type = query.get("type");
  const origin = config().APP_URL;
  if (hash && (type === "invite" || type === "recovery")) {
    const client = await supabaseServer();
    const { error } = await client.auth.verifyOtp({ token_hash: hash, type });
    if (!error)
      return NextResponse.redirect(new URL("/reset-password", origin), {
        headers: {
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
  }
  return NextResponse.redirect(new URL("/login?link=expired", origin), {
    headers: { "Cache-Control": "no-store", "Referrer-Policy": "no-referrer" },
  });
}
