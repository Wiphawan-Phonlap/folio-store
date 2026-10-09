import dotenv from "dotenv";
import fs from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { createIntroduction, type IntroBook } from "./intro-content";
import { coverColor } from "../lib/cover-colors";

dotenv.config({ path: path.join(process.cwd(), ".env.local") });

type Product = {
  id: number;
  title: string;
  author: string | null;
  subtitle: string | null;
  description: string | null;
  category_id: number | null;
  pdf_path: string | null;
  preview_path: string | null;
  introduction: string | null;
};

type Category = { id: number; name: string };

const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 58;
const BODY_SIZE = 15;
const LINE_HEIGHT = 25;
const force = process.argv.includes("--force");
const fontPath = path.join(process.cwd(), "scripts", "fonts", "Sarabun-Regular.ttf");

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`ไม่พบตัวแปรแวดล้อม ${name}`);
  return value;
}

function hexRgb(hex: string) {
  const value = hex.replace("#", "");
  return rgb(
    parseInt(value.slice(0, 2), 16) / 255,
    parseInt(value.slice(2, 4), 16) / 255,
    parseInt(value.slice(4, 6), 16) / 255
  );
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = "";
  for (const character of text.replace(/\r/g, "")) {
    if (character === "\n") {
      lines.push(line.trim());
      line = "";
      continue;
    }
    const candidate = line + character;
    if (line && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      lines.push(line.trim());
      line = character;
    } else {
      line = candidate;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function drawHeader(page: PDFPage, title: string, font: PDFFont, pageNumber: number): void {
  page.drawText(title, { x: MARGIN, y: HEIGHT - 42, size: 10, font, color: rgb(0.44, 0.53, 0.48) });
  page.drawText(String(pageNumber), { x: WIDTH - MARGIN - 8, y: 30, size: 10, font, color: rgb(0.44, 0.53, 0.48) });
}

function drawParagraph(page: PDFPage, text: string, font: PDFFont, y: number): number {
  for (const line of wrapText(text, font, BODY_SIZE, WIDTH - MARGIN * 2)) {
    page.drawText(line, { x: MARGIN, y, size: BODY_SIZE, font, color: rgb(0.08, 0.18, 0.13) });
    y -= LINE_HEIGHT;
  }
  return y - 14;
}

function addContentPage(document: PDFDocument, font: PDFFont, title: string, paragraphs: string[], pageNumber: number): number {
  const startCount = document.getPages().length;
  let page = document.addPage([WIDTH, HEIGHT]);
  drawHeader(page, title, font, pageNumber);
  page.drawText(title, { x: MARGIN, y: HEIGHT - 100, size: 25, font, color: rgb(0.1, 0.23, 0.17) });
  let y = HEIGHT - 145;
  for (const paragraph of paragraphs) {
    if (y < MARGIN + LINE_HEIGHT * 2) {
      page = document.addPage([WIDTH, HEIGHT]);
      drawHeader(page, title, font, pageNumber);
      y = HEIGHT - 90;
    }
    y = drawParagraph(page, paragraph, font, y);
  }
  return document.getPages().length - startCount;
}

function contentFor(product: Product, category: string, chapter: number): string[] {
  const context = (product.description || product.subtitle || "การเดินทางเล็ก ๆ ที่ทำให้ผู้คนมองเห็นความหมายของวันธรรมดา").slice(0, 260);
  const themes = [
    `จากเรื่องย่อของ ${product.title}: ${context}`,
    `ในหมวดหมู่${category} เรื่องราวเริ่มต้นจากสถานที่ธรรมดาแห่งหนึ่ง ผู้คนที่พบกันต่างพกความทรงจำของตัวเอง และไม่มีใครรู้ว่าการสนทนาสั้น ๆ จะเปลี่ยนทิศทางของวันนั้น`,
    `บทที่ ${chapter} พาผู้อ่านติดตามรายละเอียดเล็กน้อย ทั้งแสงแดดบนโต๊ะไม้ เสียงฝนที่ขอบหน้าต่าง และคำถามที่ยังไม่มีใครกล้าถาม ตัวละครค่อย ๆ เรียนรู้ว่าความหมายอาจซ่อนอยู่ในสิ่งที่มองผ่าน`,
    `เมื่อเหตุการณ์ดำเนินต่อ ความเงียบไม่ได้หมายถึงความว่างเปล่า แต่เป็นพื้นที่ให้ความคิดได้เติบโต การตัดสินใจหนึ่งครั้งเปิดประตูไปสู่เส้นทางใหม่ และทำให้ความสัมพันธ์ระหว่างผู้คนชัดเจนขึ้น`,
    `เรื่องแต่งสำหรับการทดสอบระบบเล่มนี้ตั้งใจชวนให้หยุดอ่านอย่างช้า ๆ ไม่มีเหตุการณ์ใดอ้างอิงจากหนังสือจริง ทุกตัวละคร สถานที่ และถ้อยคำถูกสร้างขึ้นใหม่เพื่อใช้เป็นข้อมูลตัวอย่าง`,
  ];
  return themes.slice(0, 2 + (chapter % 3));
}

async function createBookPdf(product: Product, category: string, preview: boolean): Promise<Uint8Array> {
  const document = await PDFDocument.create();
  document.registerFontkit(fontkit);
  const font = await document.embedFont(await fs.readFile(fontPath), { subset: true });
  const title = product.title || "หนังสือทดลอง";
  const author = product.author || "Folio & Co.";
  const subtitle = product.subtitle || "เรื่องเล่าสำหรับการอ่านอย่างละเมียด";
  const targetPages = 8 + (product.id % 3);

  const cover = document.addPage([WIDTH, HEIGHT]);
  cover.drawRectangle({ x: 0, y: 0, width: WIDTH, height: HEIGHT, color: hexRgb(coverColor(product.id)) });
  cover.drawText("FOLIO & CO.", { x: MARGIN, y: HEIGHT - 82, size: 15, font, color: rgb(0.77, 0.63, 0.35) });
  let coverY = HEIGHT / 2 + 85;
  for (const line of wrapText(title, font, 32, WIDTH - MARGIN * 2)) {
    cover.drawText(line, { x: MARGIN, y: coverY, size: 32, font, color: rgb(0.96, 0.98, 0.95) });
    coverY -= 42;
  }
  coverY -= 12;
  coverY = drawParagraph(cover, subtitle, font, coverY);
  cover.drawText(`โดย ${author}`, { x: MARGIN, y: coverY - 10, size: 17, font, color: rgb(0.86, 0.9, 0.86) });
  cover.drawText("ตัวอย่างเนื้อหาแต่งใหม่สำหรับทดสอบระบบ", { x: MARGIN, y: 75, size: 11, font, color: rgb(0.77, 0.63, 0.35) });

  addContentPage(document, font, "ลิขสิทธิ์", [
    "เอกสารเล่มนี้เป็นเนื้อหาสมมติที่แต่งขึ้นใหม่ทั้งหมดสำหรับทดสอบระบบ Folio & Co.",
    "ห้ามนำข้อความ ตัวละคร หรือเหตุการณ์ในเอกสารนี้ไปอ้างว่าเป็นเนื้อหาจากหนังสือจริง เนื้อหานี้ไม่มีการคัดลอกหรือดัดแปลงจากผลงานใด",
  ], 2);

  const chapterTitles = ["บทที่หนึ่ง: จุดเริ่มต้น", "บทที่สอง: ร่องรอย", "บทที่สาม: บทสนทนา", "บทที่สี่: ฤดูกาลใหม่", "บทที่ห้า: แสงท้ายเรื่อง"];
  addContentPage(document, font, "สารบัญ", [
    "หน้าปก ........................................................ 1",
    "ลิขสิทธิ์ ...................................................... 2",
    ...chapterTitles.map((chapterTitle, index) => `${chapterTitle} ........................................ ${index + 4}`),
  ], 3);

  const introductionPages = addContentPage(document, font, "บทนำ", product.introduction?.split("\n\n") || [], 4);
  const bodyPages = Math.max(1, targetPages - document.getPages().length);

  for (let index = 0; index < bodyPages; index += 1) {
    const chapterIndex = index % chapterTitles.length;
    addContentPage(document, font, chapterTitles[chapterIndex], contentFor(product, category, index + 1), index + 4 + introductionPages);
  }

  if (preview) {
    const previewDocument = await PDFDocument.create();
    previewDocument.registerFontkit(fontkit);
    const introIndexes = Array.from({ length: introductionPages }, (_, index) => index + 3);
    const copied = await previewDocument.copyPages(document, [0, 1, ...introIndexes]);
    copied.forEach((page) => previewDocument.addPage(page));
    return previewDocument.save();
  }
  return document.save();
}

async function main(): Promise<void> {
  const supabase = createClient(requiredEnv("NEXT_PUBLIC_SUPABASE_URL"), requiredEnv("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, title, author, subtitle, description, category_id, pdf_path, preview_path, introduction")
    .order("id");
  if (productsError) throw new Error(`อ่านรายการหนังสือไม่สำเร็จ: ${productsError.message}`);
  const { data: categories, error: categoriesError } = await supabase.from("categories").select("id, name");
  if (categoriesError) throw new Error(`อ่านหมวดหมู่ไม่สำเร็จ: ${categoriesError.message}`);
  const categoryMap = new Map((categories as Category[] || []).map((category) => [category.id, category.name]));
  const summary = { success: 0, skipped: 0, failed: 0 };

  for (const product of (products || []) as Product[]) {
    console.log(`[เริ่ม] #${product.id} ${product.title}`);
    let newPdfPath = "";
    let newPreviewPath = "";
    try {
      const category = categoryMap.get(product.category_id || 0) || "วรรณกรรม";
      if (!product.introduction?.trim()) {
        const introBook: IntroBook = { ...product, category };
        product.introduction = createIntroduction(introBook);
        const { error: introError } = await supabase.from("products").update({ introduction: product.introduction }).eq("id", product.id);
        if (introError) throw new Error(`บันทึกบทนำไม่สำเร็จ: ${introError.message}`);
      }
      if (product.pdf_path && !force) {
        summary.skipped += 1;
        console.log(`[ข้าม] #${product.id} ${product.title}: มีไฟล์ PDF อยู่แล้ว`);
        continue;
      }
      newPdfPath = `pdf/${crypto.randomUUID()}.pdf`;
      newPreviewPath = `previews/${crypto.randomUUID()}.pdf`;
      const [pdf, preview] = await Promise.all([
        createBookPdf(product, category, false),
        createBookPdf(product, category, true),
      ]);
      const pdfUpload = await supabase.storage.from("books").upload(newPdfPath, pdf, { contentType: "application/pdf", upsert: false });
      if (pdfUpload.error) throw new Error(`อัปโหลด PDF ไม่สำเร็จ: ${pdfUpload.error.message}`);
      const previewUpload = await supabase.storage.from("books").upload(newPreviewPath, preview, { contentType: "application/pdf", upsert: false });
      if (previewUpload.error) throw new Error(`อัปโหลด preview ไม่สำเร็จ: ${previewUpload.error.message}`);
      const update = await supabase.from("products").update({ pdf_path: newPdfPath, preview_path: newPreviewPath, file_type: "pdf" }).eq("id", product.id);
      if (update.error) throw new Error(`อัปเดตข้อมูลไม่สำเร็จ: ${update.error.message}`);
      if (force) {
        const oldFiles = [product.pdf_path, product.preview_path].filter((value): value is string => Boolean(value));
        if (oldFiles.length) await supabase.storage.from("books").remove(oldFiles);
      }
      summary.success += 1;
      console.log(`[สำเร็จ] #${product.id}: PDF 8-${8 + (product.id % 3)} หน้า, preview 3 หน้า`);
    } catch (error: unknown) {
      summary.failed += 1;
      if (newPdfPath || newPreviewPath) await supabase.storage.from("books").remove([newPdfPath, newPreviewPath].filter(Boolean));
      console.error(`[ล้มเหลว] #${product.id} ${product.title}:`, error instanceof Error ? error.message : "เกิดข้อผิดพลาด");
    }
  }
  console.log(`สรุปผล: สำเร็จ ${summary.success} | ข้าม ${summary.skipped} | ล้มเหลว ${summary.failed}`);
  if (summary.failed > 0) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "seed หนังสือไม่สำเร็จ");
  process.exitCode = 1;
});
