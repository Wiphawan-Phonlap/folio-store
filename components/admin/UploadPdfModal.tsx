"use client";

import { useState } from "react";
import { Product } from "@/components/BookCard";
import { createClient } from "@/lib/supabase-browser";

type UploadPdfModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  product: Product | null;
};

export default function UploadPdfModal({
  isOpen,
  onClose,
  onSuccess,
  product,
}: UploadPdfModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!isOpen || !product) return null;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("");
    setSuccess(false);
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) {
      setFile(null);
      return;
    }

    // ตรวจสอบนามสกุลและ MIME type ของไฟล์
    const isPdf =
      selectedFile.type === "application/pdf" ||
      selectedFile.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setError("อนุญาตเฉพาะไฟล์นามสกุล .pdf เท่านั้น");
      setFile(null);
      return;
    }

    // ตรวจสอบขนาดไฟล์ไม่เกิน 50MB (50 * 1024 * 1024 bytes)
    const MAX_SIZE = 50 * 1024 * 1024;
    if (selectedFile.size > MAX_SIZE) {
      setError(
        `ขนาดไฟล์เกินกำหนด (${(selectedFile.size / 1024 / 1024).toFixed(
          1
        )} MB) กรุณาเลือกไฟล์ขนาดไม่เกิน 50MB`
      );
      setFile(null);
      return;
    }

    setFile(selectedFile);
  }

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !product) return;

    setError("");
    setUploading(true);

    try {
      // 1. ขอ signed upload URL จาก API route ของเซิร์ฟเวอร์ (ไม่มีการส่ง body ไฟล์ผ่าน Vercel)
      const res = await fetch(`/api/admin/products/${product.id}/upload-url`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "ขอ URL สำหรับอัปโหลดไม่สำเร็จ");
      }

      const { signedUrl, token, path } = data;

      // 2. ให้เบราว์เซอร์อัปโหลดตรงเข้า Supabase Storage
      const supabase = createClient();
      let uploadSuccess = false;

      if (token && path) {
        const { error: storageError } = await supabase.storage
          .from("books")
          .uploadToSignedUrl(path, token, file);

        if (!storageError) {
          uploadSuccess = true;
        } else {
          console.warn("uploadToSignedUrl failed, trying direct PUT:", storageError);
        }
      }

      // สำรองด้วย direct PUT fetch ในกรณีที่ token helper มีปัญหา
      if (!uploadSuccess && signedUrl) {
        const directRes = await fetch(signedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
            "x-upsert": "true",
          },
          body: file,
        });

        if (!directRes.ok) {
          throw new Error("อัปโหลดไฟล์ตรงเข้า Storage ไม่สำเร็จ");
        }
        uploadSuccess = true;
      }

      if (!uploadSuccess) {
        throw new Error("ไม่สามารถอัปโหลดไฟล์ได้");
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการอัปโหลด";
      setError(msg);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-[#e3ece5] bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between border-b border-[#e3ece5] pb-3">
          <div>
            <h2 className="font-serif text-base font-bold text-[#142d20]">
              📤 อัปโหลดไฟล์หนังสือ (PDF)
            </h2>
            <p className="text-[11px] text-[#71877a]">{product.title}</p>
          </div>
          <button
            onClick={onClose}
            disabled={uploading}
            className="text-gray-400 hover:text-gray-600 text-lg"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-700 border border-emerald-200 flex items-center gap-2">
            <span>✓</span>
            <span>อัปโหลดไฟล์เข้า Storage สำเร็จเรียบร้อย!</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-4 text-xs">
          <div className="rounded-xl border-2 border-dashed border-[#dce6de] p-5 text-center hover:border-[#1b3b2b] bg-[#fafdfa]">
            <input
              type="file"
              id="pdfFile"
              accept=".pdf,application/pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <label
              htmlFor="pdfFile"
              className="flex cursor-pointer flex-col items-center justify-center"
            >
              <span className="text-3xl mb-1">📄</span>
              <span className="font-semibold text-[#142d20]">
                {file ? file.name : "เลือกไฟล์ PDF สำหรับเล่มนี้"}
              </span>
              <span className="mt-1 text-[11px] text-[#71877a]">
                {file
                  ? `ขนาด ${(file.size / 1024 / 1024).toFixed(2)} MB`
                  : "ขนาดไฟล์ไม่เกิน 50MB (บันทึกเป็นชื่อ " +
                    product.id +
                    ".pdf ใน bucket books)"}
              </span>
            </label>
          </div>

          <div className="rounded-lg bg-[#f0f5f0] p-3 text-[11px] text-[#52685b]">
            💡 ไฟล์จะถูกอัปโหลดจากเบราว์เซอร์ตรงเข้า Supabase Storage
            โดยไม่ผ่านเซิร์ฟเวอร์ Vercel จึงไม่มีข้อจำกัดขนาด 4.5MB
          </div>

          <div className="flex justify-end gap-2 border-t border-[#e3ece5] pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="rounded-lg border border-[#dce6de] px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={!file || uploading}
              className="rounded-lg bg-[#1b3b2b] px-5 py-2 font-semibold text-white shadow hover:bg-[#142d20] disabled:opacity-50"
            >
              {uploading ? "กำลังอัปโหลดเข้า Storage..." : "เริ่มอัปโหลด"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
