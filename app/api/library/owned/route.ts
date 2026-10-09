import { NextResponse } from "next/server";
import { getCurrentOwnedProductIds } from "@/lib/ownership";

export async function GET() {
  return NextResponse.json({ productIds: await getCurrentOwnedProductIds() });
}
