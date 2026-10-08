import { NextRequest, NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin-auth";

export async function GET(_req: NextRequest) {
  const admin = await getAdminUser();
  return NextResponse.json({ isAdmin: !!admin });
}
