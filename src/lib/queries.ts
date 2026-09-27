// All database reads and writes for articles and purchases (server only).

import { db, type Article, type ArticleSummary, type Kind, type User } from "./db";

const SUMMARY_COLUMNS = `
  a.id, a.title, a.teaser, a.published, a.created_at, a.writer_id,
  a.kind, a.price_cents, a.duration_seconds, a.topics,
  u.display_name AS writer_name, u.wallet AS writer_wallet`;

// ---------- Articles ----------

// All published items, optionally only articles or only podcasts.
export function listPublishedArticles(kind?: Kind): ArticleSummary[] {
  return db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS} FROM articles a JOIN users u ON u.id = a.writer_id
       WHERE a.published = 1 AND (? IS NULL OR a.kind = ?) ORDER BY a.created_at DESC`,
    )
    .all(kind ?? null, kind ?? null) as ArticleSummary[];
}

export function getArticle(id: number): Article | null {
  const article = db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS}, a.body, a.audio_path FROM articles a JOIN users u ON u.id = a.writer_id
       WHERE a.id = ?`,
    )
    .get(id) as Article | undefined;
  return article ?? null;
}

export function createArticle(item: {
  writerId: number;
  kind: Kind;
  title: string;
  teaser: string;
  body: string;
  priceCents: number;
  audioPath?: string | null;
  durationSeconds?: number | null;
}) {
  const result = db
    .prepare(
      `INSERT INTO articles (writer_id, kind, title, teaser, body, price_cents, audio_path, duration_seconds)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      item.writerId, item.kind, item.title, item.teaser, item.body,
      item.priceCents, item.audioPath ?? null, item.durationSeconds ?? null,
    );
  return Number(result.lastInsertRowid);
}

export function setPublished(articleId: number, published: boolean) {
  db.prepare("UPDATE articles SET published = ? WHERE id = ?").run(published ? 1 : 0, articleId);
}

export function deleteArticle(articleId: number) {
  db.prepare("DELETE FROM articles WHERE id = ?").run(articleId);
}

// ---------- Who may read the full text ----------

export function hasPurchased(userId: number, articleId: number): boolean {
  return (
    db.prepare("SELECT 1 FROM purchases WHERE user_id = ? AND article_id = ?").get(userId, articleId) !==
    undefined
  );
}

// Admins and the article's own writer read for free; everyone else pays once.
export function canRead(user: User | null, article: ArticleSummary): boolean {
  if (!user) return false;
  if (user.role === "admin" || user.id === article.writer_id) return true;
  return hasPurchased(user.id, article.id);
}

export function purchasedArticleIds(userId: number): Set<number> {
  const rows = db.prepare("SELECT article_id FROM purchases WHERE user_id = ?").all(userId);
  return new Set(rows.map((row) => Number(row.article_id)));
}

// ---------- Library ----------

export type LibraryItem = {
  id: number;
  title: string;
  teaser: string;
  kind: Kind;
  price_cents: number;
  duration_seconds: number | null;
  writer_name: string;
  signature: string;
  lamports: number;
  payer_wallet: string;
  bought_at: string;
};

export function listLibrary(userId: number): LibraryItem[] {
  return db
    .prepare(
      `SELECT a.id, a.title, a.teaser, a.kind, a.price_cents, a.duration_seconds, u.display_name AS writer_name,
         p.signature, p.lamports, p.payer_wallet, p.created_at AS bought_at
       FROM purchases p
       JOIN articles a ON a.id = p.article_id
       JOIN users u ON u.id = a.writer_id
       WHERE p.user_id = ? ORDER BY p.created_at DESC`,
    )
    .all(userId) as LibraryItem[];
}

export function salesCount(articleId: number): number {
  const row = db.prepare("SELECT COUNT(*) AS n FROM purchases WHERE article_id = ?").get(articleId) as { n: number };
  return row.n;
}

// ---------- Purchases ----------

export function isSignatureUsed(signature: string): boolean {
  return db.prepare("SELECT 1 FROM purchases WHERE signature = ?").get(signature) !== undefined;
}

export function savePurchase(p: {
  signature: string;
  userId: number;
  articleId: number;
  payerWallet: string;
  writerWallet: string;
  lamports: number;
}) {
  db.prepare(
    `INSERT INTO purchases (signature, user_id, article_id, payer_wallet, writer_wallet, lamports)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(p.signature, p.userId, p.articleId, p.payerWallet, p.writerWallet, p.lamports);
}

// ---------- Writer dashboard ----------

export type WriterArticleRow = ArticleSummary & { sales: number; lamports: number };

export function listWriterArticles(writerId: number): WriterArticleRow[] {
  return db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS},
         (SELECT COUNT(*) FROM purchases p WHERE p.article_id = a.id) AS sales,
         (SELECT COALESCE(SUM(p.lamports), 0) FROM purchases p WHERE p.article_id = a.id) AS lamports
       FROM articles a JOIN users u ON u.id = a.writer_id
       WHERE a.writer_id = ? ORDER BY a.created_at DESC`,
    )
    .all(writerId) as WriterArticleRow[];
}

// ---------- Users (writer settings + admin) ----------

export function setUserWallet(userId: number, wallet: string | null) {
  db.prepare("UPDATE users SET wallet = ? WHERE id = ?").run(wallet, userId);
}

export function findUserByUsername(username: string) {
  return db
    .prepare("SELECT id, username, role, display_name, wallet, password_hash FROM users WHERE username = ?")
    .get(username) as (User & { password_hash: string }) | undefined;
}

export function createUser(username: string, passwordHash: string, role: "writer" | "reader", displayName: string) {
  const result = db
    .prepare("INSERT INTO users (username, password_hash, role, display_name) VALUES (?, ?, ?, ?)")
    .run(username, passwordHash, role, displayName);
  return Number(result.lastInsertRowid);
}

export function setUserRole(userId: number, role: User["role"]) {
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, userId);
}

// ---------- Admin overview ----------

export function sampleDataCounts() {
  return db
    .prepare(
      `SELECT (SELECT COUNT(*) FROM users WHERE is_sample = 1) AS readers,
              (SELECT COUNT(*) FROM purchases WHERE is_sample = 1) AS sales`,
    )
    .get() as { readers: number; sales: number };
}

export function adminListUsers() {
  return db
    .prepare(
      `SELECT u.id, u.username, u.role, u.display_name, u.wallet, u.created_at,
         (SELECT COUNT(*) FROM articles a WHERE a.writer_id = u.id) AS articles,
         (SELECT COUNT(*) FROM purchases p WHERE p.user_id = u.id) AS purchases
       FROM users u WHERE u.is_sample = 0 ORDER BY u.id`,
    )
    .all() as (User & { created_at: string; articles: number; purchases: number })[];
}

export function adminListArticles() {
  return db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS},
         (SELECT COUNT(*) FROM purchases p WHERE p.article_id = a.id) AS sales
       FROM articles a JOIN users u ON u.id = a.writer_id ORDER BY a.created_at DESC`,
    )
    .all() as (ArticleSummary & { sales: number })[];
}

export function adminListPurchases() {
  return db
    .prepare(
      `SELECT p.signature, p.lamports, p.created_at, u.username AS buyer, a.title AS article
       FROM purchases p JOIN users u ON u.id = p.user_id JOIN articles a ON a.id = p.article_id
       WHERE p.is_sample = 0 ORDER BY p.created_at DESC LIMIT 50`,
    )
    .all() as { signature: string; lamports: number; created_at: string; buyer: string; article: string }[];
}

// ---------- Views ----------

// One view per viewer, item and day. Writers viewing their own work don't count.
export function recordView(articleId: number, viewer: string) {
  db.prepare("INSERT OR IGNORE INTO article_views (article_id, viewer, day) VALUES (?, ?, date('now'))").run(
    articleId,
    viewer,
  );
}

// ---------- Writer analytics ----------

// All numbers for one writer between `days` ago and now (days = 7, 30, 90…).
// `offset` shifts the window back, e.g. offset 30 = the 30 days before that (for the delta).
export function writerTotals(writerId: number, days: number, offset = 0) {
  const from = `-${days + offset} days`;
  const to = `-${offset} days`;
  const views = db
    .prepare(
      `SELECT COUNT(*) AS n FROM article_views v JOIN articles a ON a.id = v.article_id
       WHERE a.writer_id = ? AND v.day > date('now', ?) AND v.day <= date('now', ?)`,
    )
    .get(writerId, from, to) as { n: number };
  const sales = db
    .prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(a.price_cents), 0) AS cents, COALESCE(SUM(p.lamports), 0) AS lamports
       FROM purchases p JOIN articles a ON a.id = p.article_id
       WHERE a.writer_id = ? AND date(p.created_at) > date('now', ?) AND date(p.created_at) <= date('now', ?)`,
    )
    .get(writerId, from, to) as { n: number; cents: number; lamports: number };
  return { views: views.n, sales: sales.n, cents: sales.cents, lamports: sales.lamports };
}

// Revenue per day (euro cents), oldest first, with 0 for days without sales.
export function writerDailyRevenue(writerId: number, days: number) {
  const rows = db
    .prepare(
      `SELECT date(p.created_at) AS day, SUM(a.price_cents) AS cents, COUNT(*) AS sales
       FROM purchases p JOIN articles a ON a.id = p.article_id
       WHERE a.writer_id = ? AND date(p.created_at) > date('now', ?)
       GROUP BY day`,
    )
    .all(writerId, `-${days} days`) as { day: string; cents: number; sales: number }[];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: days }, (_, i) => {
    const day = new Date(Date.now() - (days - 1 - i) * 86_400_000).toISOString().slice(0, 10);
    return { day, cents: byDay.get(day)?.cents ?? 0, sales: byDay.get(day)?.sales ?? 0 };
  });
}

export type ItemPerformance = {
  id: number;
  title: string;
  kind: Kind;
  published: number;
  created_at: string;
  views: number;
  sales: number;
  cents: number;
};

// Views, sales and revenue per item in the chosen period.
export function writerItemPerformance(writerId: number, days: number): ItemPerformance[] {
  return db
    .prepare(
      `SELECT a.id, a.title, a.kind, a.published, a.created_at,
         (SELECT COUNT(*) FROM article_views v WHERE v.article_id = a.id AND v.day > date('now', ?1)) AS views,
         (SELECT COUNT(*) FROM purchases p WHERE p.article_id = a.id AND date(p.created_at) > date('now', ?1)) AS sales,
         (SELECT COUNT(*) FROM purchases p WHERE p.article_id = a.id AND date(p.created_at) > date('now', ?1)) * a.price_cents AS cents
       FROM articles a WHERE a.writer_id = ?2 ORDER BY cents DESC, views DESC`,
    )
    .all(`-${days} days`, writerId) as ItemPerformance[];
}

export function writerHasSampleData(writerId: number): boolean {
  return (
    db
      .prepare(
        "SELECT 1 FROM purchases p JOIN articles a ON a.id = p.article_id WHERE a.writer_id = ? AND p.is_sample = 1 LIMIT 1",
      )
      .get(writerId) !== undefined
  );
}

// ---------- Recommendations (home page) ----------

export type Recommendation = ArticleSummary & { reason: string };

// Popular = sales and views in the last 14 days.
export function popularItems(limit: number, excludeIds: Set<number> = new Set()): Recommendation[] {
  const rows = db
    .prepare(
      `SELECT ${SUMMARY_COLUMNS},
         (SELECT COUNT(*) FROM purchases p WHERE p.article_id = a.id AND p.created_at > datetime('now', '-14 days')) AS recent_sales,
         (SELECT COUNT(*) FROM article_views v WHERE v.article_id = a.id AND v.day > date('now', '-14 days')) AS recent_views
       FROM articles a JOIN users u ON u.id = a.writer_id
       WHERE a.published = 1
       ORDER BY recent_sales * 10 + recent_views DESC`,
    )
    .all() as (ArticleSummary & { recent_sales: number })[];
  return rows
    .filter((r) => !excludeIds.has(r.id))
    .slice(0, limit)
    .map((r) => ({ ...r, reason: r.recent_sales > 0 ? `${r.recent_sales} readers bought this recently` : "Trending" }));
}

// "Picked for you": items sharing topics with what the user bought, plus a bit of popularity.
export function recommendationsFor(user: User, limit: number): Recommendation[] {
  const bought = db
    .prepare(
      `SELECT a.id, a.title, a.topics FROM purchases p JOIN articles a ON a.id = p.article_id
       WHERE p.user_id = ? ORDER BY p.created_at DESC`,
    )
    .all(user.id) as { id: number; title: string; topics: string }[];
  if (bought.length === 0) return [];

  const exclude = new Set(bought.map((b) => b.id));
  const candidates = popularItems(100, exclude).filter((item) => item.writer_id !== user.id);

  const scored = candidates.map((item, rank) => {
    const topics = item.topics.split(",").filter(Boolean);
    // The most recent purchase that shares a topic explains the pick.
    const match = bought.find((b) => b.topics.split(",").some((t) => topics.includes(t)));
    const overlap = bought.reduce((sum, b) => sum + b.topics.split(",").filter((t) => topics.includes(t)).length, 0);
    return { item, score: overlap * 3 - rank * 0.2, match };
  });

  return scored
    .filter((s) => s.match)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ item, match }) => ({ ...item, reason: `Because you bought “${match!.title}”` }));
}

// ---------- Live sales feed (writer dashboard) ----------

export type RecentSale = {
  signature: string;
  created_at: string;
  is_sample: number;
  buyer: string;
  title: string;
  article_id: number;
  price_cents: number;
};

// Newest sales of this writer's work. Real purchases first, then a few sample ones for context.
export function writerRecentSales(writerId: number, limit = 8): RecentSale[] {
  return db
    .prepare(
      `SELECT p.signature, p.created_at, p.is_sample, u.username AS buyer, a.title, a.id AS article_id, a.price_cents
       FROM purchases p JOIN articles a ON a.id = p.article_id JOIN users u ON u.id = p.user_id
       WHERE a.writer_id = ?
       ORDER BY p.is_sample ASC, p.created_at DESC LIMIT ?`,
    )
    .all(writerId, limit)
    // SQLite rows have no normal prototype; browser components need plain objects.
    .map((row) => ({ ...row })) as RecentSale[];
}
