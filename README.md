# The Atelier Auction — setup guide

This is a real Next.js app: authentication runs server-side (your Anthropic key
is never exposed to visitors), listings/bids live in a Postgres database via
Supabase, and it's ready to deploy to a real domain on Vercel.

## 1. Create accounts (all free to start)
- **Supabase** — supabase.com → New project. This is your database + login system.
- **Anthropic** — console.anthropic.com → Get an API key. This runs the authentication check.
- **Stripe** — dashboard.stripe.com → get your test keys. Wire this up when you're ready to take real payments (see "Adding payments" below — it's not fully wired yet).
- **Vercel** — vercel.com → this is where the site will actually be hosted.

## 2. Set up the database
In your Supabase project, go to SQL Editor → New query, paste the contents of
`supabase/schema.sql`, and run it. This creates your tables (profiles, lots,
bids) and the security rules that keep people from bidding on unlisted lots
or editing each other's data.

## 3. Configure environment variables
Copy `.env.example` to `.env.local` and fill in the real values from Supabase,
Anthropic, and Stripe (Supabase keys are under Project Settings → API).

## 4. Run it locally
```
npm install
npm run dev
```
Open http://localhost:3000 — you should see the (empty) catalog.

## 5. Deploy
- Push this folder to a GitHub repo.
- In Vercel: New Project → import that repo.
- Add the same environment variables from `.env.local` in Vercel's project settings.
- Deploy. Vercel gives you a `*.vercel.app` URL immediately.
- To use your own domain: Vercel project → Settings → Domains → add it, then
  point your domain's DNS at Vercel following the instructions it shows you.

## What's already working
- Sign-in via email magic link (Supabase Auth)
- Listing a piece, running it through the AI authenticator, and going live
  for bidding if it's certified
- Browsing certified lots and placing bids with minimum-bid enforcement
- Every lot's authentication report shown on its detail page

## What's stubbed / next steps
- **Payments**: Stripe keys are in `.env.example` but checkout isn't wired
  up yet — when an auction closes you'll want a Stripe Checkout session for
  the winning bidder and a payout flow for the seller (Stripe Connect handles
  paying out to multiple sellers).
- **Image storage**: images are currently stored as base64 text directly in
  the database, which works fine for prototyping but doesn't scale — move
  uploads to Supabase Storage (or S3) for a production site.
- **Auction close handling**: nothing currently marks a lot "sold" or
  notifies the winner when `ends_at` passes — you'll want a scheduled job
  (Supabase has cron support, or a Vercel Cron job) that runs periodically
  and finalizes ended auctions.
- **Human review queue**: flagged lots are saved with `status = 'flagged'`
  but there's no admin view yet to review and manually approve/reject them.
