-- =========================================================================
-- Folio & Co. - Supabase Database & Performance Optimizations
-- =========================================================================
-- ไฟล์นี้รวบรวมคำสั่ง SQL เพื่อเพิ่มประสิทธิภาพการค้นหาและตรวจสอบโครงสร้างตาราง
-- สำหรับแอดมินนำไปรันใน Supabase Dashboard > SQL Editor
-- =========================================================================

-- 1. สร้าง Extension pg_trgm สำหรับการค้นหาข้อความแบบ Case-Insensitive (ILIKE) รวดเร็วขึ้น
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. ดัชนี (Indexes) เพื่อเพิ่มความเร็วในการค้นหาชื่อหนังสือและชื่อผู้แต่ง
CREATE INDEX IF NOT EXISTS idx_products_title_trgm ON products USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_products_author_trgm ON products USING gin (author gin_trgm_ops);

-- 3. ดัชนีสำหรับการกรองหมวดหมู่และการเรียงลำดับ
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products (category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON products (is_featured);

-- 4. ดัชนีสำหรับการตรวจสอบประวัติคำสั่งซื้อเมื่อลบหนังสือ (Foreign Key Performance)
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders (user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders (created_at DESC);

-- 5. สิทธิ์และ Bucket สำหรับ Supabase Storage 'books' (กรณีต้องการตรวจสอบความถูกต้อง)
-- หมายเหตุ: หากมี bucket 'books' อยู่แล้ว คำสั่งนี้จะไม่ส่งผลกระทบ
INSERT INTO storage.buckets (id, name, public)
VALUES ('books', 'books', false)
ON CONFLICT (id) DO NOTHING;