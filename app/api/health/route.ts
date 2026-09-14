import { config } from "@/lib/server/config";
import { json } from "@/lib/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    config();
    return json({ status: "ok", service: "teamplus", version: "1.0.0" });
  } catch {
    return json({ status: "unavailable" }, 503);
  }
}
