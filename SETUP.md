# TonTon Storage — setup

Next.js app for storage intake, contracts, and automatic renewal notices.
Stack: **Next.js 14 · Supabase (data) · Resend (email) · Vercel (hosting + daily cron)**.

## What it does
1. You create an **intake link** and email it to a client (Resend).
2. Client fills in their contact + property details; it lands in your dashboard.
3. You set the **term + monthly rate**; the app generates the branded **Storage Lot Agreement** (print/PDF).
4. A **daily cron job** finds fixed-term rentals ending within **30 days** and emails the tenant a renewal notice with **Extend** / **Vacate** buttons.
5. **Extend** → you get an email → you set extension length + pricing → the app emails the tenant a branded **Extension & Modification Addendum**. **Vacate** → you get a move-out notice.

Month-to-month rentals have no fixed end date, so they are skipped by the renewal cron.

---

## 1. Add the logo
Save the TonTon logo image as **`public/logo.png`** (used on screen, in the contract/addendum, and in emails).

## 2. Supabase
1. In the Supabase dashboard, open **SQL Editor** and run the contents of [`supabase/schema.sql`](supabase/schema.sql).
2. Go to **Project Settings → API** and copy the **Project URL** and the **service_role** key.

## 3. Resend
1. In Resend, verify the sending domain for `thetrailerteam.com` (Domains → Add).
2. Create an **API key**.
3. `EMAIL_FROM` must use a verified domain, e.g. `TonTon Trailer Rentals <storage@thetrailerteam.com>`.

## 4. Environment variables
Copy `.env.local.example` to `.env.local` and fill in:

| Var | Where |
|-----|-------|
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `RESEND_API_KEY` | Resend → API Keys |
| `EMAIL_FROM` | Verified Resend sender |
| `PROVIDER_EMAIL` | Where extend/vacate notices go (Anton) |
| `APP_URL` | `http://localhost:3500` locally; your Vercel URL in production |
| `CRON_SECRET` | Any long random string |

## 5. Run locally
```
npm install
npm run dev
```
Open http://localhost:3500

## 6. Deploy to Vercel
1. Push this folder to GitHub.
2. Import the repo in Vercel.
3. Add all the env vars from `.env.local` in **Vercel → Project → Settings → Environment Variables** (set `APP_URL` to your Vercel domain).
4. The daily renewal cron is defined in [`vercel.json`](vercel.json) (`0 14 * * *` = 14:00 UTC daily). Vercel runs it automatically and includes the `CRON_SECRET` as a Bearer token.

### Test the cron manually
```
curl -H "Authorization: Bearer YOUR_CRON_SECRET" https://YOUR-APP.vercel.app/api/cron/renewals
```

---

## Notes / still to do
- **No login yet** on the admin dashboard — add `ADMIN_PASSWORD` gating or Supabase Auth before going live.
- **No e-signature** — contracts are print-and-sign (Print → Save as PDF). E-sign can be added later.
- The old Express rough draft is archived in `legacy-express/` and is no longer used.
