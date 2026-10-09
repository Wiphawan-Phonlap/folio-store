import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSafeRedirectPath } from "@/lib/auth-redirect";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const requestedNext = request.nextUrl.searchParams.get("next") || request.nextUrl.searchParams.get("redirect");
  const isRecovery = request.nextUrl.searchParams.get("flow") === "recovery"
    || request.nextUrl.searchParams.get("type") === "recovery";
  const next = getSafeRedirectPath(
    requestedNext
  );
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorPath = isRecovery
        ? `/update-password?flow=recovery&error_code=${encodeURIComponent(error.code || "invalid_link")}`
        : `/login?error=oauth&next=${encodeURIComponent(next)}`;
      return NextResponse.redirect(new URL(errorPath, request.url));
    }
  }
  const destination = isRecovery
    ? "/update-password?flow=recovery"
    : next;
  return NextResponse.redirect(new URL(destination, request.url));
}
