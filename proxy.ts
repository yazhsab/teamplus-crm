import type { NextRequest } from "next/server";
import { refreshSession } from "@/lib/session-proxy";
export function proxy(request: NextRequest) {
  return refreshSession(request);
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.svg).*)"],
};
