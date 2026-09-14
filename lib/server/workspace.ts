import { z } from "zod";
import { actionInput } from "@/lib/validation";
import { session } from "./session";
import {
  dbError,
  failure,
  HttpError,
  json,
  readJSON,
  sameOrigin,
} from "./http";
const requestId = z.string().uuid();
export async function workspaceGET() {
  try {
    const s = await session();
    const { data, error } = await s.client.rpc("teamplus_workspace", {
      p_org: s.org,
    });
    if (error) dbError(error);
    return json({
      ...data,
      user: {
        name: s.user.user_metadata?.full_name || s.user.email || "Team member",
        email: s.user.email || "",
        role: s.role,
      },
      mode: "production",
    });
  } catch (error) {
    return failure(error, "workspace.read");
  }
}
export async function workspacePOST(request: Request) {
  try {
    sameOrigin(request);
    const s = await session();
    const id = requestId.safeParse(request.headers.get("idempotency-key"));
    if (!id.success)
      throw new HttpError(400, "A valid request ID is required.");
    const input = actionInput.safeParse(await readJSON(request));
    if (!input.success)
      throw new HttpError(
        400,
        input.error.issues[0]?.message || "Check the entered fields.",
      );
    if (input.data.action === "completeTask" && !input.data.version)
      throw new HttpError(400, "Refresh this task before updating it.");
    const command = await s.client.rpc("teamplus_command", {
      p_org: s.org,
      p_request_id: id.data,
      p_input: input.data,
    });
    if (command.error) dbError(command.error);
    // Mutation success is returned even if the following read fails. Clients must
    // never mistake a committed payment for a failed write and create a new one.
    const read = await s.client.rpc("teamplus_workspace", { p_org: s.org });
    return json({
      ...command.data,
      data: read.error ? undefined : read.data,
      refreshRequired: !!read.error,
    });
  } catch (error) {
    return failure(error, "workspace.write");
  }
}
