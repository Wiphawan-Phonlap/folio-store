This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Stripe payments and webhooks

The checkout flow updates `orders.status` to `paid` through the Stripe webhook
and also verifies the Checkout Session when the customer returns to
`/library`. Configure these server-side variables in `.env.local` and Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
NEXT_PUBLIC_SITE_URL=https://your-production-domain.example
```

`STRIPE_WEBHOOK_SECRET` must be the signing secret for the exact endpoint being
called. Never expose `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, or
`STRIPE_WEBHOOK_SECRET` to the browser.

For local testing, run the app and forward Stripe events:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` value printed by `stripe listen` into
`STRIPE_WEBHOOK_SECRET`, then trigger a test Checkout Session. In production,
add `https://your-production-domain.example/api/webhooks/stripe` as a Stripe
Dashboard webhook endpoint and subscribe to `checkout.session.completed` and
`checkout.session.async_payment_succeeded`.

## เติมไฟล์หนังสือตัวอย่าง

สร้างบทนำภาษาไทยสำหรับหนังสือสมมติที่ยังไม่มีบทนำ:

```bash
npm run seed:intros
```

สร้างบทนำใหม่ทุกเล่ม:

```bash
npm run seed:intros -- --force
```

สคริปต์นี้อ่านหนังสือจาก `products` แล้วสร้าง PDF ภาษาไทย 8–10 หน้าและ preview
3 หน้า ก่อนอัปโหลดไปยัง bucket `books` โดยใช้
`SUPABASE_SERVICE_ROLE_KEY` เฉพาะฝั่งสคริปต์ และจะข้ามเล่มที่มี `pdf_path`
อยู่แล้ว:

```bash
npm run seed:books
```

หากต้องการสร้างไฟล์ใหม่แทนไฟล์เดิม ให้ใช้:

```bash
npm run seed:books -- --force
```

ฟอนต์สำหรับไฟล์ตัวอย่างอยู่ที่ `scripts/fonts/Sarabun-Regular.ttf` หากยังไม่มีไฟล์
ให้ดาวน์โหลด Sarabun Regular จาก Google Fonts แล้ววางไว้ที่ path นี้:

```text
https://github.com/google/fonts/raw/main/ofl/sarabun/Sarabun-Regular.ttf
```

ห้ามใส่ค่า secret หรือ commit `.env.local` สคริปต์จะโหลดค่าจาก `.env.local`
ด้วย `dotenv` เฉพาะตอนรันบนเครื่องฝั่ง server/script เท่านั้น

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
