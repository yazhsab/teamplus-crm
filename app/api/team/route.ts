import { z } from "zod";
import { session } from "@/lib/server/session";
import {
  dbError,
  failure,
  HttpError,
  json,
  readJSON,
  sameOrigin,
} from "@/lib/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const s = await session();
    const result = await s.client.rpc("teamplus_members", { p_org: s.org });
    if (result.error) dbError(result.error);
    return json({ members: result.data });
  } catch (error) {
    return failure(error, "team.read");
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const s = await session();
    const id = z
      .string()
      .uuid()
      .safeParse(request.headers.get("idempotency-key"));
    const input = z
      .object({
        userId: z.string().uuid(),
        role: z.enum(["admin", "manager", "member", "viewer", "remove"]),
      })
      .strict()
      .safeParse(await readJSON(request, 2000));
    if (!id.success || !input.success)
      throw new HttpError(400, "Choose a valid member and role.");
    const result = await s.client.rpc("teamplus_command", {
      p_org: s.org,
      p_request_id: id.data,
      p_input: { action: "setMember", ...input.data },
    });
    if (result.error) dbError(result.error);
    return json({ ok: true });
  } catch (error) {
    return failure(error, "team.write");
  }
}
