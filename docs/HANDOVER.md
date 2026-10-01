# Knowledge file: PayPerRead

For a new Claude session (e.g. on Marcel's desktop PC). It sums up everything from the first build session
on the Mac (Sept 2026) that isn't obvious from the code. `README.md` covers features, demo accounts and how
payments work: read both before changing anything. Last updated: 2026-10-01.

## 1. The project in one paragraph

PayPerRead is a hackathon prototype for the **BMT 2026 Solana case**: a news site where readers pay
**€0.05 per story** and **€0.20 per podcast episode** on **Solana Devnet** instead of subscribing, and the money
goes **straight to the creator's wallet**. Slogan: **"Read what matters. Pay for just that."**
Built solo by **Marcel Pfitzer** (GitHub `marcelpfitzer`, repo `marcelpfitzer/SolanaCaseBMT2026`).

## 2. How Marcel works (please follow)

- He is a **beginner**: keep code simple and commented, explain changes in plain words, no jargon without explanation.
- He writes in German or English; answer in his language. Product, website, video and deck are in **English**.
- **Don't change the design unless asked.** He noticed and disliked unrequested changes (e.g. when the filter tabs changed shape). Apple-style design; tokens in `src/app/globals.css` (black `#000`, ink `#1d1d1f`, light gray `#f5f5f7`, the only accent blue `#0071e3`).
- **Verify in a real browser** before saying something works (on the Mac: headless Chrome + puppeteer-core scripts).
- **Commit/push only when he asks.**
- He is the **only person** on the project (the deck's team slide says "One founder, end to end").

## 3. What exists (state on 2026-10-01)

| Thing | Where | Notes |
| --- | --- | --- |
| Web app | this repo | Next.js 16, TypeScript, Tailwind v4, wallet-adapter (Phantom + built-in Demo Wallet), SQLite via `node:sqlite` (Node 24+) |
| Showcase video | `pitch/payperread-showcase.mp4` (≈50 MB) | 3:05 min, 1920×1080, English captions, fake cursor, **no audio** |
| Pitch deck | `pitch/PayPerRead-Pitch.pptx` (≈52 MB) + `pitch/PayPerRead-Pitch.pdf` | 15 slides, 16:9, animated, video embedded on slide 5, speaker notes on every slide |
| Deck generator | `pitch/build_deck.py` + `pitch/img/` | python-pptx; rebuilds the .pptx from code |
| Video recorder | `pitch/record/` | scripted Chrome run + macOS-only Swift encoder (see `pitch/README.md`) |

Commits so far: initial app → profiles/authors/scroll-aware top bar → Library button + profile icons + 20 MB avatars → this knowledge file + `pitch/`.

### Features built (in order)
Articles and podcasts with free teasers and paid full content · logins with roles (reader / author = `writer` in code / admin, password `1234` for all demo accounts) · Demo Wallet (keypair in localStorage, Devnet only) · settings with wallet, balance and a low-balance (< €1) notification · library with offline mode (PWA service worker) and "Restore purchases" from the blockchain memo · filter tabs All / Stories / Podcasts / Library (fixed size, sliding pill, no scroll jump) · personalised home ("Picked for you" / "Popular right now") · writer dashboard (KPIs, revenue chart, what's working / needs attention, live sales every 4 s with "New sale" pop-up) · 90 days of generated sample data for `writer_demo` · one "Name" field (greeting uses the first word) · profile picture upload (≤ 20 MB) or one of 12 icons · readers apply to become authors (motivation ≥ 80 chars, topics, writing sample ≥ 400 chars), admin approves/rejects · scroll-aware top bar · Library button in the top bar.

## 4. Gotchas in the code

- **Next.js 16** has breaking changes: read `node_modules/next/dist/docs/` first (see `AGENTS.md`). Uses `PageProps<"/route">` / `RouteContext<…>` globals (`npx next typegen`), Server Actions with `useActionState`, `router.push(url, { scroll: false })`.
- **Critical layout uses inline styles** (header, filter tabs, user menu), not Tailwind classes, because stale CSS / service worker once broke the tab bar. Keep it that way.
- **Service worker only in production**; in dev it unregisters itself (`src/components/OfflineSupport.tsx`).
- **`node:sqlite` rows have a null prototype**: spread them (`{ ...row }`) before passing to client components.
- **Forms keep typed values after errors**: actions are wrapped in `keepValues`, inputs use `defaultValue={state.values?.x}`.
- **Server Action body limit** 26 MB (`next.config.ts`): podcasts ≤ 25 MB, profile pictures ≤ 20 MB (`src/lib/avatars.ts`).
- **Choosing an icon deletes the uploaded photo** (`deleteAvatarUpload`), on purpose.
- Signup always creates a **reader**.
- Top bar (`HeaderShell`): solid black, 88 px bar and 42 px logo at the top → 52 px translucent glass bar and 24 px logo after 160 px of scrolling. On phones the Library button and profile show icons only.

## 5. Local data (not in git)

- `data/payperread.sqlite` is created and seeded on first start. A fresh clone gets demo accounts, 12 stories, 3 podcasts and sample sales. Delete `data/` to start over.
- `media/avatars/`: uploaded photos (Daniel = `demo`, Franzi = `writer_demo`) exist only on the Mac. On a fresh clone the profiles show initials. The originals are AI-generated portraits Marcel can upload again in Settings.
- `.env.local` (Mac only) holds the secret key of the publisher wallet. **The app does not need it**; only `pitch/record/fund.mjs` does.

## 6. Solana Devnet

- `writer_demo`'s payout wallet = "publisher" wallet `EAC9koXpV2SWhTtMUqH8kJhiqoQX6BD57SPPtWGt36Um` (≈0.0026 SOL).
- The public faucet is rate-limited (429 / "Internal error"). Use https://faucet.solana.com with GitHub login.
- Fixed demo rate €150/SOL. Every payment has a memo `payperread:<id>`; the server verifies the transaction on-chain (`src/lib/verifyPayment.ts`) before saving the purchase.

## 7. The showcase video (storyboard)

1. Landing page, scroll (top bar shrinks): "PayPerRead: pay per story, not per month."
2. Log in as `demo` (Daniel): personal greeting and picks, switch Podcasts / Stories.
3. Open "What Actually Happens When You Press 'Unlock'": free teaser, paywall "Keep reading for €0.05".
4. Connect the Demo Wallet, pay €0.05, server verifies on-chain, full text appears.
5. Library: purchases, offline, proof on the blockchain.
6. Settings: balance, pick the fox icon, apply as author.
7. Admin approves the application.
8. `writer_demo` (Franzi) dashboard: KPIs, chart, insights; a second hidden browser buys "The Paywall Problem…", and the "New sale" pop-up appears.
9. End card: logo, slogan, `github.com/marcelpfitzer/SolanaCaseBMT2026`.

Captured at 1280×720 and upscaled, so it's slightly soft on a projector. The "Low balance" pop-up was hidden for the recording.

## 8. The pitch deck (slide by slide)

1. Title: logo, slogan, "Pay-per-read journalism and podcasts, paid straight to the creator on Solana.", "Solana Case · BMT 2026"
2. Problem: 83% don't pay for online news (Reuters Institute DNR 2024: 17% pay) · readers want 1 story, not a contract · €0.25 fixed card fee (Stripe EEA 1.5% + €0.25)
3. Solution: €0.05 per story · €0.20 per podcast · €0 subscription · 100% to the creator
4. How it works: connect wallet → pay €0.05 → server verifies → yours to keep
5. Live demo: the embedded video (plays on click)
6. For readers: picks, stories + podcasts, offline library, proof of ownership (screenshots)
7. For creators: KPIs, what's working, live sales, curated authors (screenshots)
8. Why Solana: < €0.001 fee, seconds, on-chain receipt
9. Business model (**proposed**): €0.045 creator / €0.005 platform (10%), split on-chain; newsroom plan (white-label widget, SaaS)
10. Who it's for: creators (independent journalists, local newsrooms, podcasters) and readers (the 83%, occasional readers, crypto-native users)
11. Competition matrix: subscription ↔ pay per story × platform ↔ direct; PayPerRead is alone in "per story + direct"
12. Status: real on-chain payments, 12 stories + 3 podcasts, roles with review, analytics, offline library, restore from wallet
13. Roadmap: Now (Devnet prototype) → 3 months (Mainnet, USDC prices, fee split) → 6 months (3 newsroom pilots, embeddable widget) → 12 months (card/Apple Pay top-ups, bundles). Animated step by step: each dot with its text, then the line wipes to the next dot.
14. Team: Marcel Pfitzer, "Founder · product, design and engineering", "Built solo" list (initials "MP"; a photo could replace them)
15. Ask: "We're looking for" newsroom/creator pilots, go-to-market mentoring, a Mainnet partner; QR code to the GitHub repo

Animations: every slide fades in, and its elements build automatically (fade + "Ascend", 0.22 s apart; the roadmap uses 0.45 s).
**Before presenting:** check the two sourced numbers on slide 2 against current sources.

## 9. Working on the desktop PC

- Setup: `git clone`, `npm install`, `npm run dev` → http://localhost:3000. Needs **Node 24+** (`node:sqlite`).
- **Fonts:** the deck uses "Helvetica Neue". On Windows, PowerPoint substitutes another font (usually Arial), so line breaks may shift. If it looks off, set `FONT` in `pitch/build_deck.py` (e.g. "Arial" or "Segoe UI") and rebuild, or replace the font in PowerPoint (Home → Replace → Replace Fonts).
- Rebuilding the deck works on any OS (Python + python-pptx). Re-export the PDF afterwards (PowerPoint: File → Export → PDF).
- **Re-recording the video is macOS-only as written** (Swift encoder). On Windows, swap `encode.swift` for ffmpeg, e.g. build a concat list from `frames.json` timestamps.
- Editing the deck by hand in PowerPoint is fine, but `build_deck.py` won't know about those edits. Decide on one way per change.

## 10. Bounty submission

Bounty: https://superteam.fun/earn/listing/build-at-whu ("Build an MVP with Solana at WHU", Superteam Germany, 1st $1,500 / 2nd $1,000 / 3rd $500 in USDG).
**Deadline: 4 Oct 2026, 23:59 German time** (21:59:59 UTC). The submission can be edited until then.
Requirements: participant at WHU Hackathon 2026 · working prototype using Solana · pitch-deck link in the "Bounty submission link" field · public GitHub repo · follow https://x.com/SuperteamDE.
Deck link to submit: the PDF on GitHub (`pitch/PayPerRead-Pitch.pdf`). The README's "Hackathon submission" section has all links, including real Devnet transactions.

## 11. Open points

- **Filter tabs sometimes don't react to clicks** (All / Stories / Podcasts): seen in automated runs right after login, not reproducible later, cause unknown. Possibly what Marcel meant by "you can't click here anymore" (his screenshot never arrived).
- Video slightly soft (see section 7); no voice-over yet.
- On the Mac, stray files from a bad copy sit in `~/.claude/skills` (CHANGELOG.md, SKILL.md, scripts, references, …). Marcel has the cleanup command; nothing to do on the PC.
