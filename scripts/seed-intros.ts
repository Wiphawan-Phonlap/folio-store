import dotenv from "dotenv";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { createIntroduction, type IntroBook } from "./intro-content";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

type Product = Omit<IntroBook, "category"> & { category_id: number | null; introduction: string | null };
type Category = { id: number; name: string };

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`ไม่พบตัวแปรแวดล้อม ${name}`);
  return value;
}

async function main(): Promise<void> {
  const supabase = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: products, error } = await supabase
    .from("products")
    .select("id, title, author, subtitle, description, category_id, introduction")
    .order("id");
  if (error) throw new Error(`อ่านรายการหนังสือไม่สำเร็จ: ${error.message}`);
  const { data: categories, error: categoryError } = await supabase.from("categories").select("id, name");
  if (categoryError) throw new Error(`อ่านหมวดหมู่ไม่สำเร็จ: ${categoryError.message}`);
  const categoryMap = new Map((categories as Category[] || []).map((category) => [category.id, category.name]));
  const force = process.argv.includes("--force");
  let success = 0;
  let skipped = 0;
  let failed = 0;

  for (const product of (products || []) as Product[]) {
    if (product.introduction?.trim() && !force) {
      skipped += 1;
      console.log(`[ข้าม] #${product.id} ${product.title}: มีบทนำแล้ว`);
      continue;
    }
    try {
      const book: IntroBook = {
        ...product,
        category: categoryMap.get(product.category_id || 0) || "วรรณกรรม",
      };
      const introduction = createIntroduction(book);
      const { error: updateError } = await supabase
        .from("products")
        .update({ introduction })
        .eq("id", product.id);
      if (updateError) throw new Error(updateError.message);
      success += 1;
      console.log(`[สำเร็จ] #${product.id} ${product.title}: บันทึกบทนำ ${introduction.length} ตัวอักษร`);
    } catch (error: unknown) {
      failed += 1;
      console.error(`[ล้มเหลว] #${product.id} ${product.title}:`, error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    }
  }
  console.log(`สรุปผลบทนำ: สำเร็จ ${success} | ข้าม ${skipped} | ล้มเหลว ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed บทนำไม่สำเร็จ");
  process.exitCode = 1;
});
