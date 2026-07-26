# BizLite 2026

BizLite 2026 is a production-ready, mobile-first Progressive Web App for small business management. It covers sales, expenses, products, customers, reports, and basic business settings — with Supabase authentication, PostgreSQL storage via Prisma, and installable PWA support for Android and iPhone.

## Main features

- Dashboard with profit cards, charts, quick actions, and date filters
- Multi-item sales with invoice numbers, stock reduction, and payment tracking
- Expenses by category
- Products with stock adjustments and stock movements
- Customers with receivables and payment recording
- Reports with CSV export
- Business setup and settings
- Light / dark mode
- Installable PWA with offline shell fallback

## Technology stack

- Next.js (App Router) + TypeScript
- Tailwind CSS + shadcn/ui-style components
- Supabase Auth + Supabase PostgreSQL
- Prisma ORM
- React Hook Form + Zod
- Recharts
- date-fns
- Sonner
- next-themes
- `@ducanh2912/next-pwa`
- Vercel-ready deployment

## Local installation

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Fill in your Supabase values (see below).

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Supabase project setup

1. Create a project at [https://supabase.com](https://supabase.com).
2. Go to **Project Settings → Database** and copy:
   - **Connection string (URI)** for `DIRECT_URL` (port `5432`)
   - **Connection pooling** URI for `DATABASE_URL` (port `6543`, add `?pgbouncer=true`)
3. Go to **Project Settings → API** and copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only)
4. Authentication → Providers → Email: enable Email provider.
5. Authentication → URL configuration:
   - Site URL: `http://localhost:3000` (local) or your production domain
   - Redirect URLs: include `http://localhost:3000/reset-password` and your production reset URL

## Environment variables

See `.env.example`:

```env
DATABASE_URL=""
DIRECT_URL=""
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""
SUPABASE_SERVICE_ROLE_KEY=""
```

Never commit real secrets. Never expose the service-role key to the browser.

## Prisma migration

```bash
npx prisma generate
npx prisma migrate dev --name init
```

Studio:

```bash
npm run db:studio
```

## Seed instructions

```bash
npm run seed
```

Demo login created by the seed script:

- Email: `demo@bizlite.app`
- Password: `Demo1234!`

Requires `SUPABASE_SERVICE_ROLE_KEY` and a working database connection.

## Development commands

```bash
npm run dev
npm run typecheck
npm run lint
npm run build
npm run start
npm run seed
npm run db:generate
npm run db:migrate
npm run db:studio
```

Exact quality commands:

```bash
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
npm run typecheck
npm run lint
npm run build
```

## Production build

```bash
npm run build
npm run start
```

## Vercel deployment

1. Push the repository to GitHub.
2. Import the project in Vercel.
3. Add all environment variables from `.env.example`.
4. Deploy.
5. In Supabase Auth URL settings, set the Site URL and redirect URLs to your Vercel domain.
6. Run migrations against production:

```bash
npx prisma migrate deploy
```

Optionally seed production with care:

```bash
npm run seed
```

## Custom-domain setup

1. Add your domain in the Vercel project settings.
2. Update DNS as instructed by Vercel.
3. Update Supabase Auth Site URL and redirect URLs to the custom domain.
4. Redeploy if needed.

## PWA installation on Android

1. Open BizLite 2026 in Chrome.
2. Use the browser install prompt, or open **More → Install BizLite 2026** / **Settings → Install BizLite 2026**.
3. Confirm install.
4. Launch from the home screen (standalone, no browser bar).

## PWA installation on iPhone

1. Open BizLite 2026 in Safari.
2. Tap **Share**.
3. Tap **Add to Home Screen**.
4. Confirm **Add**.
5. Open BizLite 2026 from the home screen.

In-app instructions are also shown under **More** and **Settings** on iOS.

## Application-update behaviour

The service worker uses `skipWaiting` and `clientsClaim`. After a new deployment, the next visit activates the updated service worker so users receive the latest version automatically.

## Offline behaviour

BizLite 2026 requires internet for database operations.

When offline:

- The app shell can still load from cache
- An offline banner appears
- `/offline` is used as the document fallback
- Forms disable saving when the server cannot be reached
- The app does not pretend a transaction was saved

## Security notes

- Routes are protected by middleware + server-side `requireProfile()`
- Every query is scoped by `userId`
- Critical sale operations run inside Prisma transactions
- Money math uses Decimal.js (not floating point)
- Service-role key stays server-side only

## Troubleshooting

| Issue | Fix |
| --- | --- |
| `Prisma` connection errors | Check `DATABASE_URL` / `DIRECT_URL`, password encoding, and Supabase network restrictions |
| Auth redirect loops | Confirm Supabase URL/keys and Site URL settings |
| Seed fails | Ensure service-role key is set and Email auth is enabled |
| PWA not installable | Use HTTPS (or localhost), open in a supported browser, confirm `manifest.webmanifest` and icons load |
| iPhone install missing | Must use Safari → Share → Add to Home Screen |
| Charts empty | Add sales/expenses for the selected date range |

## License

Private project — all rights reserved.
