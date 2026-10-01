# PayPerRead

Hackathon prototype: a news site where readers pay **€0.05 per article** and **€0.20 per podcast episode** on **Solana Devnet** instead of subscribing. Payments go **directly to the creator's wallet**.

Stack: Next.js 16 + TypeScript + Tailwind, Solana wallet-adapter (Phantom + a built-in Demo Wallet), SQLite (Node's built-in `node:sqlite`).

## Hackathon submission

Built for **Superteam Germany's "Build an MVP with Solana at WHU"** bounty (WHU Business meets Tech hackathon 2026) by **Marcel Pfitzer** (solo).

- **Pitch deck:** [PDF, opens in the browser](pitch/PayPerRead-Pitch.pdf) · [PowerPoint with animations and embedded video](https://github.com/marcelpfitzer/SolanaCaseBMT2026/raw/main/pitch/PayPerRead-Pitch.pptx)
- **Demo video (3 min):** [payperread-showcase.mp4](https://github.com/marcelpfitzer/SolanaCaseBMT2026/raw/main/pitch/payperread-showcase.mp4): a reader pays €0.05 on Devnet, an author gets approved, the writer sees the sale live.
- **Real Devnet payments made with the app** (SOL transfer to the writer + memo `payperread:<id>`):
  [story "Why a Coffee Costs More Than a Good Story"](https://explorer.solana.com/tx/5WXuf8Qjy9LWeywDwCaSnybjip1v5y97Vw96xPF7D8DMqd9PiskKQPgj7JWG6X2TuJ8yxLRmMXoBimAAF4Zg3nUN?cluster=devnet) ·
  [story "Stablecoins, Explained Without the Hype"](https://explorer.solana.com/tx/5QmR7pfHNPKk4J5BU2Zwv86BVD8gSZGYKvP4CgoNnwvvZu2damPUGyU1AxMVpZvHcnQ6csZ9yCW9Mo8YKWP82Et7?cluster=devnet) ·
  [podcast "The Five-Cent Question"](https://explorer.solana.com/tx/4JXovBR5ZazVNcbzSosGje2GRcQV9AcmMyPp8sUDzd1J3cDo7ckq8LYps5VGCcquGqZTVuHo1KG3nAjrdjNgcko4?cluster=devnet)

**How Solana is used:** every purchase is a Solana transfer straight from the reader's wallet to the writer's wallet (no platform account in between). A memo on the same transaction records which item was bought; the server verifies the transaction on-chain before unlocking, and readers can restore their purchases from their wallet history. Network fees are a fraction of a cent, which makes €0.05 payments possible in the first place.

## Run it locally

You need [Node.js](https://nodejs.org) 24 or newer.

```bash
npm install     # once, installs dependencies
npm run dev     # starts the dev server
```

Open http://localhost:3000. On first start the database `data/payperread.sqlite` is created with the demo accounts, 12 articles and 3 podcast episodes.

## Demo accounts (password `1234`)

| Username      | Role   | Can do                                                        |
| ------------- | ------ | ------------------------------------------------------------- |
| `demo`        | reader | Read teasers, pay €0.05 to unlock articles                    |
| `writer_demo` | author | Publish articles, set payout wallet, see sales (`/write`)     |
| `admin`       | admin  | Everything: review author applications, users & roles, hide/delete any article (`/admin`) |

New accounts are always **readers** (`/signup`). To write, a reader **applies for an author account** in Settings (motivation, topics, writing sample); an admin reviews every application on `/admin` and approves or rejects it. This keeps low-effort content off the site.

## How paying works

1. Log in, then connect a wallet: **Phantom** (set to Devnet) or the **Demo Wallet** (no install needed, key stays in your browser).
2. The wallet needs a bit of Devnet SOL: get it free at https://faucet.solana.com (log in with GitHub for higher limits).
3. On an article, click **Unlock**. Your wallet sends ≈ €0.05 in SOL (fixed demo rate €150/SOL) to the writer's wallet.
4. The server checks the transaction on Devnet and saves the purchase for your account. The article stays unlocked.

Writers and admins read their own/all articles for free.

## Home page & writer dashboard

- **Home:** logged-in readers get "Picked for you" (items that share topics with what they bought, with the reason shown); everyone else sees "Popular right now" (most bought/viewed in the last 14 days).
- **Writer dashboard** (`/write`): revenue, sales, views and conversion for the last 7/30/90 days with the change vs the previous period, a revenue-per-day chart (hover for details, or "Show as table"), "What's working" / "Needs attention" with tips, and a table for every item.
- **Latest sales · live:** the dashboard checks for new purchases every 4 seconds. When `demo` buys something, `writer_demo` sees a "New sale" pop-up and the numbers update (great for a live pitch: two browser windows side by side).
- **Views** are counted once per viewer, item and day (`/api/view`); writers viewing their own work and admins don't count.

### Sample data (test data)

On first start, `writer_demo` gets 90 days of **generated** views and sales (`src/lib/sampleData.ts`), with deliberately good and bad performers, so the dashboard has something to show. Sample sales come from 150 "Sample Reader" accounts that cannot log in, are marked `is_sample`, are labeled "(sample)" in the live feed and are hidden from the admin overview. Real purchases are never changed.

## Library, offline use & ownership

- **Library** (`/library`, or the "Library" tab): everything you bought, with a link to each payment on Solana Explorer.
- **Offline:** bought items are saved on the device automatically (service worker in `public/sw.js`, cache logic in `src/lib/offline.ts`). Articles and podcasts open without internet; logging out removes the copies. Test offline mode with a production build (`npm run build && npm start`); the dev server needs a connection.
- **Proof of ownership:** every payment includes a memo `payperread:<id>` on the blockchain. "Restore purchases from wallet" (in the library) lets you sign a message with your wallet; the server then finds those payments in the wallet's history and adds them back to your account.
- Bought items are never deleted: if a creator or admin deletes one, it is only hidden from the shop, and buyers keep access.

## Podcasts

- Podcast audio lives in `media/` (not `public/`) and is streamed by `/api/media/<id>` only to people who paid, the creator and admins.
- The 3 demo episodes are **placeholders**, generated with macOS text-to-speech from the scripts in `scripts/podcasts/` (`python3 scripts/make-podcasts.py`).
- **Use your own recording:** put a file with the same name into `media/podcasts/`, e.g. `media/podcasts/five-cent-question.mp3`. An `.mp3` wins over the generated `.m4a`. Update the transcript in `scripts/podcasts/` if the content changes.
- Writers can also publish new episodes in `/write` (MP3, M4A, AAC, WAV or OGG, up to 25 MB). Uploads are saved in `media/uploads/` (git-ignored).

## Project structure

```
src/
  app/
    page.tsx                 home: all published articles
    articles/[id]/page.tsx   one article (full text only after payment)
    login/, signup/          accounts
    write/                   writer dashboard
    admin/                   admin overview
    actions.ts               server actions (login, publish, admin tools)
    api/unlock/route.ts      checks a payment and saves the purchase
    api/media/[id]/route.ts  streams podcast audio to paying listeners
    api/restore/route.ts     restores purchases from a wallet's blockchain history
    library/                 your purchases, offline downloads, restore
  components/                Header, UnlockPanel, wallet button, …
  lib/
    db.ts                    SQLite tables + first-start demo data
    seedArticles.ts          the starting articles + podcast episodes
    media.ts                 podcast audio files (find, upload, delete)
    auth.ts, password.ts     sessions (httpOnly cookie) + password hashing
    queries.ts               all database reads/writes
    verifyPayment.ts         checks a transaction on Solana Devnet
    DemoWalletAdapter.ts     the Demo Wallet (Devnet only!)
```

To start over with fresh demo data, stop the server and delete the `data/` folder.

## Security notes (prototype)

- Demo passwords are `1234`. Change them before showing this anywhere public.
- The Demo Wallet stores its secret key in the browser. Devnet only, never real money.
- `.env.local` holds the secret key of `writer_demo`'s payout wallet. It is git-ignored; never commit it.
