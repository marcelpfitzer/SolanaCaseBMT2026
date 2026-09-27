// SAMPLE DATA (test data, not real): topics for every demo item, plus 90 days of
// generated views and sales for writer_demo, so the writer dashboard and the
// recommendations have something to show. Some items perform well, some badly.
//
// Sample sales are marked with is_sample = 1 and bought by generated
// "Sample Reader" accounts that cannot log in. Real purchases are never touched.

import type { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { priceLamports } from "./config";

const DAYS = 90;
const SAMPLE_READERS = 150;

// title → topics, and how it performs: views per day and share of viewers who buy.
const PROFILES: Record<string, { topics: string; views: number; conversion: number }> = {
  "What Actually Happens When You Press “Unlock”": { topics: "how-it-works,solana", views: 11, conversion: 0.16 },
  "The Five-Cent Question": { topics: "journalism,payments", views: 8, conversion: 0.2 },
  "Five Questions to Ask Before You Trust a Crypto App": { topics: "security,basics", views: 10, conversion: 0.13 },
  "Why a Coffee Costs More Than a Good Story": { topics: "journalism,business", views: 7, conversion: 0.1 },
  "Stablecoins, Explained Without the Hype": { topics: "stablecoins,basics", views: 9, conversion: 0.08 },
  "What Is a Crypto Wallet, Really?": { topics: "wallets,basics", views: 6, conversion: 0.09 },
  "Keys, Seeds and Wallets for Beginners": { topics: "wallets,security", views: 5, conversion: 0.12 },
  "Behind the Build: How a Pay-per-Read App Works": { topics: "how-it-works,solana", views: 4, conversion: 0.07 },
  "Devnet, Testnet, Mainnet: A Beginner's Map of Solana": { topics: "solana,basics", views: 4, conversion: 0.06 },
  "The Paywall Problem: Why Most Readers Never Subscribe": { topics: "journalism,business", views: 5, conversion: 0.05 },
  "Phishing in Web3: The Tricks Scammers Use": { topics: "security,wallets", views: 6, conversion: 0.07 },
  // Bad performers:
  "How to Read a Blockchain Explorer": { topics: "solana,how-it-works", views: 12, conversion: 0.015 }, // seen a lot, rarely bought
  "Transaction Fees, Explained: Why a Cent Can Be Too Expensive": { topics: "payments,solana", views: 2, conversion: 0.03 },
  "Writers as Small Businesses: Getting Paid per Piece": { topics: "journalism,business", views: 2.5, conversion: 0.05 },
  "Your Reading Data: What a Pay-per-Article Site Needs to Know": { topics: "privacy", views: 1.5, conversion: 0.02 },
};

// Small deterministic random generator, so the sample data is the same every time.
function random(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dayString = (daysAgo: number) => new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);

export function addSampleData(db: DatabaseSync) {
  const writer = db.prepare("SELECT id FROM users WHERE username = 'writer_demo'").get() as { id: number } | undefined;
  if (!writer) return;
  const rand = random(2026);

  db.exec("BEGIN");
  try {
    // 1. Topics for every demo item.
    const setTopics = db.prepare("UPDATE articles SET topics = ? WHERE title = ?");
    for (const [title, profile] of Object.entries(PROFILES)) setTopics.run(profile.topics, title);

    // 2. Spread writer_demo's items over the last ~75 days (newest first), so the history makes sense.
    const items = db
      .prepare("SELECT id, title, price_cents FROM articles WHERE writer_id = ? ORDER BY created_at DESC")
      .all(writer.id) as { id: number; title: string; price_cents: number }[];
    const setDate = db.prepare("UPDATE articles SET created_at = datetime('now', ?) WHERE id = ?");
    items.forEach((item, i) => setDate.run(`-${2 + i * 5} days`, item.id));

    // 3. Sample readers (can't log in: the password hash is not a valid hash).
    const addReader = db.prepare(
      "INSERT OR IGNORE INTO users (username, password_hash, role, display_name, is_sample) VALUES (?, ?, 'reader', ?, 1)",
    );
    for (let n = 1; n <= SAMPLE_READERS; n++) {
      const num = String(n).padStart(3, "0");
      addReader.run(`sample_reader_${num}`, `!sample:${randomBytes(8).toString("hex")}`, `Sample Reader ${num}`);
    }
    const readerIds = (
      db.prepare("SELECT id FROM users WHERE is_sample = 1 ORDER BY id").all() as { id: number }[]
    ).map((r) => r.id);

    // 4. Views and sales, day by day.
    const addView = db.prepare("INSERT OR IGNORE INTO article_views (article_id, viewer, day) VALUES (?, ?, ?)");
    const addSale = db.prepare(
      `INSERT OR IGNORE INTO purchases (signature, user_id, article_id, payer_wallet, writer_wallet, lamports, created_at, is_sample)
       VALUES (?, ?, ?, 'SampleWallet', 'SampleWallet', ?, ?, 1)`,
    );

    items.forEach((item, i) => {
      const profile = PROFILES[item.title];
      if (!profile) return;
      const ageDays = Math.min(DAYS, 2 + i * 5);
      const buyers = [...readerIds].sort(() => rand() - 0.5); // each reader buys an item at most once
      let saleNo = 0;

      for (let daysAgo = ageDays; daysAgo >= 0; daysAgo--) {
        const sinceLaunch = ageDays - daysAgo;
        const launchBoost = 1 + 1.5 * Math.exp(-sinceLaunch / 3); // busy first days
        const growth = 0.8 + 0.4 * (1 - daysAgo / DAYS); // the site grows slowly
        const weekday = new Date(Date.now() - daysAgo * 86_400_000).getUTCDay();
        const weekend = weekday === 0 || weekday === 6 ? 0.7 : 1;
        const views = Math.round(profile.views * launchBoost * growth * weekend * (0.6 + rand() * 0.8));
        const day = dayString(daysAgo);

        for (let v = 0; v < views; v++) {
          addView.run(item.id, `sample:${Math.floor(rand() * 5000)}`, day);
          if (rand() < profile.conversion && saleNo < buyers.length) {
            // A time on that day, but never in the future (today: some minutes/hours ago).
            const time =
              daysAgo === 0
                ? new Date(Date.now() - (30 + rand() * 300) * 60_000).toISOString().slice(0, 19).replace("T", " ")
                : `${day} ${String(8 + Math.floor(rand() * 14)).padStart(2, "0")}:${String(Math.floor(rand() * 60)).padStart(2, "0")}:00`;
            addSale.run(`SAMPLE-${item.id}-${saleNo}`, buyers[saleNo], item.id, priceLamports(item.price_cents), time);
            saleNo++;
          }
        }
      }
    });
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
