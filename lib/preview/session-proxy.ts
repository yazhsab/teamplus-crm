import { NextResponse } from "next/server";
export async function refreshSession() {
  return NextResponse.next();
}
