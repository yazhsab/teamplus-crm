import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { config } from "@/lib/server/config";

export async function refreshSession(request: NextRequest) {
  const nonce = btoa(crypto.randomUUID());
  const development = process.env.NODE_ENV !== "production";
  let storageOrigin = "";
  try {
    storageOrigin = new URL(config().SUPABASE_URL).origin;
  } catch {}
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // File uploads go directly to signed Supabase Storage URLs.
    `connect-src 'self' ${storageOrigin}${development ? " ws:" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set("Content-Security-Policy", csp);
  // Forwarded preview identity is never used in the production runtime.
  for (const name of [...headers.keys()])
    if (name.startsWith("oai-authenticated-user-")) headers.delete(name);
  let response = NextResponse.next({ request: { headers } });
  try {
    const c = config();
    const client = createServerClient(
      c.SUPABASE_URL,
      c.SUPABASE_PUBLISHABLE_KEY,
      {
        cookieOptions: {
          httpOnly: true,
          sameSite: "lax",
          secure: c.APP_URL.startsWith("https://"),
          path: "/",
        },
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: (items) => {
            for (const { name, value } of items)
              request.cookies.set(name, value);
            headers.set("cookie", request.cookies.toString());
            response = NextResponse.next({ request: { headers } });
            for (const { name, value, options } of items)
              response.cookies.set(name, value, options);
          },
        },
      },
    );
    // Only refresh existing sessions. Login/health without cookies needs no Auth call.
    if (request.cookies.getAll().some((c) => c.name.startsWith("sb-")))
      await client.auth.getClaims();
  } catch {
    // Protected routes fail closed and return a controlled error if configuration/Auth is unavailable.
  }
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
