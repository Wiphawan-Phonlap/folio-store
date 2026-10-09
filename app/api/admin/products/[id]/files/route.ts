import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase-admin";

const rules = {
  cover: { bucket: "covers", prefix: "covers", max: 2 * 1024 * 1024, types: ["image/jpeg", "image/png", "image/webp"], column: "cover_path" },
  pdf: { bucket: "books", prefix: "pdf", max: 50 * 1024 * 1024, types: ["application/pdf"], column: "pdf_path" },
  epub: { bucket: "books", prefix: "epub", max: 50 * 1024 * 1024, types: ["application/epub+zip", "application/octet-stream"], column: "epub_path" },
  preview: { bucket: "books", prefix: "previews", max: 20 * 1024 * 1024, types: ["application/pdf"], column: "preview_path" },
} as const;

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { errorResponse } = await requireAdminApi();
  if (errorResponse) return errorResponse;
  const id = Number((await props.params).id);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "รหัสหนังสือไม่ถูกต้อง" }, { status: 400 });

  const form = await req.formData();
  const admin = createAdminClient();
  const { data: current, error: currentError } = await admin.from("products").select("cover_path, pdf_path, epub_path, preview_path").eq("id", id).single();
  if (currentError || !current) return NextResponse.json({ error: "ไม่พบหนังสือ" }, { status: 404 });

  const updated: Record<string, string> = {};
  const removed: { bucket: string; path: string }[] = [];
  const uploaded: { bucket: string; path: string }[] = [];

  for (const kind of Object.keys(rules) as (keyof typeof rules)[]) {
    const file = form.get(kind);
    if (!(file instanceof File) || file.size === 0) continue;
    const rule = rules[kind];
    if (file.size > rule.max || !rule.types.includes(file.type as never)) {
      const limit = rule.max / (1024 * 1024);
      return NextResponse.json({ error: `${kind === "cover" ? "ปก" : kind.toUpperCase()} ต้องเป็นชนิดไฟล์ที่รองรับและมีขนาดไม่เกิน ${limit} MB` }, { status: 400 });
    }

    const path = `${rule.prefix}/${crypto.randomUUID()}.${kind === "cover" ? file.type.split("/")[1].replace("jpeg", "jpg") : kind}`;
    const { error: uploadError } = await admin.storage.from(rule.bucket).upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) {
      for (const file of uploaded) {
        await admin.storage.from(file.bucket).remove([file.path]);
      }
      return NextResponse.json({ error: `อัปโหลดไฟล์ ${kind} ไม่สำเร็จ` }, { status: 500 });
    }
    uploaded.push({ bucket: rule.bucket, path });
    updated[rule.column] = path;
    const oldPath = current[rule.column as keyof typeof current];
    if (oldPath) removed.push({ bucket: rule.bucket, path: oldPath });
  }

  if (Object.keys(updated).length > 0) {
    const { error: updateError } = await admin.from("products").update(updated).eq("id", id);
    if (updateError) {
      for (const file of uploaded) {
        await admin.storage.from(file.bucket).remove([file.path]);
      }
      return NextResponse.json({ error: "บันทึก path ไฟล์ไม่สำเร็จ" }, { status: 500 });
    }
    for (const file of removed) await admin.storage.from(file.bucket).remove([file.path]);
  }
  return NextResponse.json({ files: updated });
}
