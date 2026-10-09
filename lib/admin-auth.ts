import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { getCurrentUserProfile } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export async function getAdminUser(): Promise<User | null> {
  const profile = await getCurrentUserProfile();
  return profile?.role === "admin" ? profile.user : null;
}

export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) redirect("/");
  return user;
}

export async function requireAdminApi(): Promise<
  { user: User; errorResponse?: never } | { user?: never; errorResponse: NextResponse }
> {
  const user = await getAdminUser();
  if (!user) {
    return {
      errorResponse: NextResponse.json(
        { error: "Forbidden: สิทธิ์การเข้าถึงสำหรับผู้ดูแลระบบเท่านั้น" },
        { status: 403 }
      ),
    };
  }
  return { user };
}
