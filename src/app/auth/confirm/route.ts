import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
export async function GET(request: NextRequest) {
  const hash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");
  const client = await createClient();
  if (client && hash && type === "signup") {
    const { error } = await client.auth.verifyOtp({
      token_hash: hash,
      type: "signup",
    });
    if (!error) return NextResponse.redirect(new URL("/account", request.url));
  }
  return NextResponse.redirect(new URL("/auth/error", request.url));
}
