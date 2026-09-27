// SQLite database (server only). Uses Node's built-in SQLite, no extra package needed.
// The file is created automatically at data/payperread.sqlite, filled with the
// demo accounts and articles on first start.

import { mkdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";
import { PRICE_CENTS } from "./config";
import { addSampleData } from "./sampleData";
import { seedArticles, seedPodcasts } from "./seedArticles";

mkdirSync("data", { recursive: true });
export const db = new DatabaseSync("data/payperread.sqlite");
db.exec("PRAGMA foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'writer', 'reader')),
    display_name  TEXT NOT NULL,
    wallet        TEXT,              -- writers: where their article payments go
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY,     -- we only store a hash of the cookie value
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS articles (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    writer_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    teaser     TEXT NOT NULL,
    body       TEXT NOT NULL,
    published  INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    signature     TEXT PRIMARY KEY,  -- Solana transaction ID: each payment counts once
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    article_id    INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    payer_wallet  TEXT NOT NULL,
    writer_wallet TEXT NOT NULL,
    lamports      INTEGER NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (user_id, article_id)
  );
`);

// ---------- Migrations (older databases get the new columns) ----------

const columnsOf = (table: string) =>
  (db.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).map((c) => c.name);
const addColumn = (table: string, name: string, definition: string) => {
  if (!columnsOf(table).includes(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
};
addColumn("articles", "kind", "TEXT NOT NULL DEFAULT 'article'"); // 'article' or 'podcast'
addColumn("articles", "price_cents", "INTEGER NOT NULL DEFAULT 5");
addColumn("articles", "audio_path", "TEXT"); // podcasts: file inside media/
addColumn("articles", "duration_seconds", "INTEGER"); // podcasts: length
addColumn("articles", "topics", "TEXT NOT NULL DEFAULT ''"); // e.g. "wallets,security"
addColumn("users", "is_sample", "INTEGER NOT NULL DEFAULT 0"); // generated test readers
addColumn("users", "first_name", "TEXT"); // no longer used (merged into display_name)
addColumn("users", "avatar", "TEXT"); // "icon:<file>" or "upload:<file>", null = initial letter
addColumn("purchases", "is_sample", "INTEGER NOT NULL DEFAULT 0"); // generated test sales

// Readers who want to write apply first; an admin approves or rejects.
db.exec(`
  CREATE TABLE IF NOT EXISTS author_applications (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    motivation  TEXT NOT NULL,
    topics      TEXT NOT NULL,
    sample_url  TEXT,
    sample_text TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_note  TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now')),
    reviewed_at TEXT
  )
`);

// Who looked at what. One row per viewer, item and day (so reloads don't inflate numbers).
db.exec(`
  CREATE TABLE IF NOT EXISTS article_views (
    article_id INTEGER NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
    viewer     TEXT NOT NULL,        -- "user:<id>", "anon:<random>" or "sample:<n>"
    day        TEXT NOT NULL,        -- YYYY-MM-DD
    UNIQUE (article_id, viewer, day)
  );
  CREATE INDEX IF NOT EXISTS idx_views_article_day ON article_views (article_id, day);
`);

db.exec("CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)");

// ---------- First start: demo accounts ----------

// writer_demo receives payments in this Devnet wallet (secret key is in .env.local).
const WRITER_DEMO_WALLET = "EAC9koXpV2SWhTtMUqH8kJhiqoQX6BD57SPPtWGt36Um";

const userCount = db.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number };
if (userCount.n === 0) {
  const addUser = db.prepare(
    "INSERT INTO users (username, password_hash, role, display_name, wallet) VALUES (?, ?, ?, ?, ?)",
  );
  addUser.run("admin", hashPassword("1234"), "admin", "Admin", null);
  addUser.run("writer_demo", hashPassword("1234"), "writer", "Demo Writer", WRITER_DEMO_WALLET);
  addUser.run("demo", hashPassword("1234"), "reader", "Demo Reader", null);
}

// ---------- Demo content (added once per content version) ----------

const CONTENT_VERSION = 2;
const version = db.prepare("SELECT value FROM meta WHERE key = 'content_version'").get() as
  | { value: string }
  | undefined;

if (Number(version?.value ?? 0) < CONTENT_VERSION) {
  const writer = db.prepare("SELECT id FROM users WHERE username = 'writer_demo'").get() as
    | { id: number }
    | undefined;
  if (writer) {
    const exists = db.prepare("SELECT 1 FROM articles WHERE title = ?");
    const add = db.prepare(
      `INSERT INTO articles (writer_id, kind, title, teaser, body, price_cents, audio_path, duration_seconds, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`,
    );

    // Articles: 1 day apart, newest first.
    seedArticles.forEach((a, i) => {
      if (exists.get(a.title)) return;
      add.run(writer.id, "article", a.title, a.teaser, a.body, PRICE_CENTS.article, null, null, `-${i * 24} hours`);
    });

    // Podcasts: in between the articles. The transcript becomes the "body".
    const durations = readJson<Record<string, number>>("media/podcasts/durations.json") ?? {};
    seedPodcasts.forEach((p, i) => {
      if (exists.get(p.title)) return;
      const transcript = readFileSync(`scripts/podcasts/${p.file}.txt`, "utf8")
        .split("\n")
        .filter((line) => line.includes(":"))
        .map((line) => {
          const [speaker, ...text] = line.split(":");
          return `${speaker.trim().charAt(0)}${speaker.trim().slice(1).toLowerCase()}: ${text.join(":").trim()}`;
        })
        .join("\n\n");
      add.run(
        writer.id, "podcast", p.title, p.teaser, transcript, PRICE_CENTS.podcast,
        `podcasts/${p.file}`, durations[p.file] ?? null, `-${i * 48 + 12} hours`,
      );
    });
  }
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('content_version', ?)").run(String(CONTENT_VERSION));
}

// Version 3: topics for recommendations + 90 days of sample performance data.
if (Number(version?.value ?? 0) < 3) {
  addSampleData(db);
  db.prepare("INSERT OR REPLACE INTO meta (key, value) VALUES ('content_version', '3')").run();
}

function readJson<T>(path: string): T | null {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as T;
  } catch {
    return null;
  }
}

// ---------- Types ----------

export type Role = "admin" | "writer" | "reader";

export type User = {
  id: number;
  username: string;
  role: Role;
  display_name: string;
  wallet: string | null;
  avatar: string | null;
};

export type ArticleSummary = {
  id: number;
  title: string;
  teaser: string;
  published: number;
  created_at: string;
  writer_id: number;
  writer_name: string;
  writer_wallet: string | null;
  kind: Kind;
  price_cents: number;
  duration_seconds: number | null;
  topics: string;
};

export type Kind = "article" | "podcast";

export type Article = ArticleSummary & { body: string; audio_path: string | null };
