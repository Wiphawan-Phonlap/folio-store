# Folio & Co.

ร้านหนังสือดิจิทัลสำหรับค้นหา เลือกซื้อ และดาวน์โหลดหนังสือในรูปแบบ PDF
พร้อมระบบจัดการสำหรับผู้ดูแลร้านค้า

## ภาพรวมระบบ

- ผู้ใช้ค้นหาหนังสือ ดูรายละเอียด ทดลองอ่าน และเพิ่มหนังสือลงตะกร้า
- สมัครสมาชิกและเข้าสู่ระบบเพื่อสั่งซื้อและเข้าถึงห้องสมุดส่วนตัว
- ชำระเงินผ่าน Stripe และตรวจสอบสถานะคำสั่งซื้อด้วย Webhook
- ดาวน์โหลดหนังสือที่ซื้อสำเร็จแล้วจาก Supabase Storage
- ผู้ดูแลระบบจัดการหนังสือ หมวดหมู่ ไฟล์ PDF และคำสั่งซื้อผ่าน Admin Dashboard
- รองรับการนำเว็บไซต์ไปใช้งานเป็นแอป Android ด้วย Capacitor

## เทคโนโลยีที่ใช้

- **Next.js, React, TypeScript** — พัฒนาเว็บแอปและส่วนติดต่อผู้ใช้
- **Tailwind CSS** — ออกแบบ UI และรองรับ Responsive Design
- **Supabase / PostgreSQL** — จัดการฐานข้อมูล สมาชิก Authentication และ Storage
- **Stripe** — ระบบชำระเงินออนไลน์และตรวจสอบการชำระเงิน
- **Capacitor** — แปลงเว็บแอปเป็น Android Application
- **PDF-lib** — สร้างไฟล์หนังสือและไฟล์ตัวอย่าง PDF

## การทำงานหลัก

1. ผู้ใช้เลือกหนังสือจากหน้าร้านและเพิ่มลงตะกร้า
2. ระบบสร้างคำสั่งซื้อและพาผู้ใช้ไปชำระเงินผ่าน Stripe
3. Stripe Webhook อัปเดตสถานะคำสั่งซื้อเมื่อชำระเงินสำเร็จ
4. หนังสือจะแสดงในห้องสมุดส่วนตัว และดาวน์โหลดได้เฉพาะผู้ที่ซื้อแล้ว

## การติดตั้งและเริ่มต้นใช้งาน

ติดตั้ง dependencies:

```bash
npm install
```

สร้างไฟล์ `.env.local` และกำหนดค่าที่จำเป็น:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

เริ่มเซิร์ฟเวอร์สำหรับการพัฒนา:

```bash
npm run dev
```

จากนั้นเปิด [http://localhost:3000](http://localhost:3000)

> ห้าม commit ไฟล์ `.env.local` หรือเปิดเผยค่า Secret Key ในฝั่ง Client

## คำสั่งที่ใช้บ่อย

```bash
npm run dev       # เริ่มโหมดพัฒนา
npm run build     # สร้าง Production Build
npm run lint      # ตรวจสอบคุณภาพโค้ด
npm run seed:intros  # สร้างบทนำหนังสือตัวอย่าง
npm run seed:books   # สร้างและอัปโหลดไฟล์หนังสือตัวอย่าง
```
