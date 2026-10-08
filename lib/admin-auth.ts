import { createClient } from "@/lib/supabase-server";
import { User } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

/**
 * อ่านรายการอีเมลแอดมินจาก process.env.ADMIN_EMAILS
 * ตัดช่องว่างและแปลงเป็นตัวพิมพ์เล็ก
 */
export function getAdminEmails(): string[] {
  const env = process.env.ADMIN_EMAILS || "";
  return env
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * ตรวจสอบว่าอีเมลที่ระบุมีสิทธิ์แอดมินหรือไม่
 */
export function isEmailAdmin(email?: string | null): boolean {
  if (!email) return false;
  const adminEmails = getAdminEmails();
  return adminEmails.includes(email.trim().toLowerCase());
}

/**
 * ตรวจสอบสิทธิ์แอดมินฝั่งเซิร์ฟเวอร์ด้วย supabase.auth.getUser()
 * คืนค่า user หากเป็นแอดมิน หรือ null หากไม่ใช่หรือไม่ล็อกอิน
 */
export async function getAdminUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return null;
    }

    if (!isEmailAdmin(user.email)) {
      return null;
    }

    return user;
  } catch (err) {
    if (typeof err === "object" && err !== null && "digest" in err) {
      throw err;
    }
    console.error("Error verifying admin user:", err);
    return null;
  }
}

/**
 * ใช้ใน Server Component หรือหน้าระบบแอดมิน (/admin/*)
 * หากไม่ใช่แอดมิน จะ redirect ไปที่หน้าแรก (/) ทันที
 */
export async function requireAdmin(): Promise<User> {
  const user = await getAdminUser();
  if (!user) {
    redirect("/");
  }
  return user;
}

/**
 * ใช้ใน API route ของแอดมิน (/api/admin/*)
 * หากไม่ใช่แอดมิน จะส่งผลตอบกลับ 403 Forbidden
 */
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
