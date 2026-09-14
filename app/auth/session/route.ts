import { z } from "zod";
import { supabaseServer } from "@/lib/supabase/server";
import { config } from "@/lib/server/config";
import {
  failure,
  HttpError,
  json,
  readJSON,
  sameOrigin,
} from "@/lib/server/http";
const schema = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("login"),
      email: z.string().email().max(254),
      password: z.string().min(1).max(128),
    })
    .strict(),
  z
    .object({ action: z.literal("reset"), email: z.string().email().max(254) })
    .strict(),
  z
    .object({
      action: z.literal("password"),
      password: z.string().min(12).max(128),
    })
    .strict(),
]);
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const parsed = schema.safeParse(await readJSON(request, 4000));
    if (!parsed.success)
      throw new HttpError(
        400,
        "Check your email and password. New passwords need at least 12 characters.",
      );
    const input = parsed.data;
    const client = await supabaseServer();
    if (input.action === "login") {
      const result = await client.auth.signInWithPassword({
        email: input.email,
        password: input.password,
      });
      if (result.error)
        throw new HttpError(
          result.error.status === 429 ? 429 : 401,
          result.error.status === 429
            ? "Too many attempts. Try again later."
            : "Email or password is incorrect.",
        );
    } else if (input.action === "reset") {
      // Do not disclose whether an email is registered.
      const result = await client.auth.resetPasswordForEmail(input.email, {
        redirectTo: `${config().APP_URL}/auth/confirm`,
      });
      if (result.error && result.error.status && result.error.status >= 500)
        throw new Error("Email unavailable.");
    } else {
      const identity = await client.auth.getUser();
      if (identity.error || !identity.data.user)
        throw new HttpError(
          401,
          "Open a fresh password reset or invitation link.",
        );
      const result = await client.auth.updateUser({ password: input.password });
      if (result.error)
        throw new HttpError(
          400,
          "Password could not be changed. Use a different password or request a new link.",
        );
      // Revoke other refresh sessions; existing access tokens expire normally.
      await client.auth.signOut({ scope: "others" });
    }
    return json({ ok: true });
  } catch (error) {
    return failure(error, "auth.session");
  }
}
