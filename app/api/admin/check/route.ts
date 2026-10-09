import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

export async function GET() {
  const admin = await getAdminUser();
  return NextResponse.json({ isAdmin: !!admin });
}
