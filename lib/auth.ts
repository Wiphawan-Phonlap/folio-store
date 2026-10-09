import { createClient } from "@/lib/supabase-server";
import type { User } from "@supabase/supabase-js";

export type ProfileRole = "user" | "customer" | "admin";

export async function getCurrentUserProfile(): Promise<{
  user: User;
  role: ProfileRole;
} | null> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) return null;
  return { user, role: profile.role as ProfileRole };
}

export async function isCurrentUserAdmin(): Promise<boolean> {
  const profile = await getCurrentUserProfile();
  return profile?.role === "admin";
}
