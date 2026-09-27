import Link from "next/link";
import { removeArticle, togglePublished } from "@/app/actions";
import ConfirmButton from "@/components/ConfirmButton";
import { requireUser } from "@/lib/auth";
import { lamportsToSol } from "@/lib/config";
import { firstName, formatDate } from "@/lib/format";
import {
  listWriterArticles,
  writerDailyRevenue,
  writerHasSampleData,
  writerItemPerformance,
  writerRecentSales,
  writerTotals,
  type ItemPerformance,
} from "@/lib/queries";
import NewArticleForm from "./NewArticleForm";
import LiveSales from "./LiveSales";
import RevenueChart from "./RevenueChart";
import WalletForm from "./WalletForm";

const RANGES = [7, 30, 90];
const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const pct = (share: number) => `${(share * 100).toFixed(1)}%`;
const conversion = (sales: number, views: number) => (views > 0 ? sales / views : 0);

// Status of one item, always shown as icon + label (never color alone).
type Status = { icon: string; label: string; tone: "good" | "bad" | "neutral"; tip?: string };

// Views per day since the item went online (within the period), so new items aren't punished.
function viewsPerDay(item: ItemPerformance, days: number) {
  const ageDays = (Date.now() - new Date(item.created_at.replace(" ", "T") + "Z").getTime()) / 86_400_000;
  return item.views / Math.max(1, Math.min(days, ageDays));
}

function statusOf(item: ItemPerformance, avgViewsPerDay: number, avgConversion: number, days: number): Status {
  const conv = conversion(item.sales, item.views);
  const perDay = viewsPerDay(item, days);
  if (!item.published) return { icon: "–", label: "Hidden", tone: "neutral" };
  if (item.views < 20) return { icon: "●", label: "Too early to tell", tone: "neutral" };
  if (perDay >= avgViewsPerDay * 1.3 && conv < avgConversion * 0.4) {
    return {
      icon: "▼",
      label: "Needs attention",
      tone: "bad",
      tip: "Lots of readers open it, very few buy. Make the teaser promise exactly what the piece delivers.",
    };
  }
  if (perDay < avgViewsPerDay * 0.35) {
    return {
      icon: "▼",
      label: "Needs attention",
      tone: "bad",
      tip: "Hardly anyone finds it. Share it, or try a clearer, more specific title.",
    };
  }
  if (conv >= avgConversion * 1.4 && item.sales >= 5) {
    return { icon: "▲", label: "Top performer", tone: "good", tip: "Readers who open it usually buy it. Do more like this." };
  }
  return { icon: "●", label: "Steady", tone: "neutral" };
}

const TONE_CLASS = { good: "text-[#006300]", bad: "text-[#d03b3b]", neutral: "text-black/60" };

// "▲ 12%" compared with the previous period. Up is good for every KPI here.
function Delta({ now, before, points }: { now: number; before: number; points?: boolean }) {
  if (points) {
    const diff = (now - before) * 100;
    if (Math.abs(diff) < 0.05) return <span className="text-black/50">no change</span>;
    return (
      <span className={diff > 0 ? TONE_CLASS.good : TONE_CLASS.bad}>
        {diff > 0 ? "▲" : "▼"} {Math.abs(diff).toFixed(1)} pts
      </span>
    );
  }
  if (before === 0) return <span className="text-black/50">{now > 0 ? "new" : "no change"}</span>;
  const change = (now - before) / before;
  if (Math.abs(change) < 0.005) return <span className="text-black/50">no change</span>;
  return (
    <span className={change > 0 ? TONE_CLASS.good : TONE_CLASS.bad}>
      {change > 0 ? "▲" : "▼"} {Math.abs(change * 100).toFixed(0)}%
    </span>
  );
}

export default async function WritePage({ searchParams }: PageProps<"/write">) {
  const user = await requireUser("writer", "admin");
  const { range } = await searchParams;
  const days = RANGES.includes(Number(range)) ? Number(range) : 30;

  const now = writerTotals(user.id, days);
  const before = writerTotals(user.id, days, days);
  const daily = writerDailyRevenue(user.id, days);
  const items = writerItemPerformance(user.id, days);
  const articles = listWriterArticles(user.id);
  const sample = writerHasSampleData(user.id);

  // Averages over published items with any views, used to judge each item.
  const seen = items.filter((i) => i.published && i.views > 0);
  const avgViewsPerDay = seen.reduce((s, i) => s + viewsPerDay(i, days), 0) / Math.max(seen.length, 1);
  const avgConversion = conversion(
    seen.reduce((s, i) => s + i.sales, 0),
    seen.reduce((s, i) => s + i.views, 0),
  );
  const withStatus = items.map((item) => ({ item, status: statusOf(item, avgViewsPerDay, avgConversion, days) }));
  const working = withStatus.filter((x) => x.status.tone === "good").slice(0, 3);
  const attention = withStatus.filter((x) => x.status.tone === "bad").slice(0, 3);
  const maxConversion = Math.max(...items.map((i) => conversion(i.sales, i.views)), 0.01);

  const kpis = [
    { label: "Revenue", value: eur(now.cents), sub: `${lamportsToSol(now.lamports).toFixed(4)} SOL`, delta: <Delta now={now.cents} before={before.cents} /> },
    { label: "Sales", value: now.sales.toLocaleString("en-GB"), delta: <Delta now={now.sales} before={before.sales} /> },
    { label: "Views", value: now.views.toLocaleString("en-GB"), delta: <Delta now={now.views} before={before.views} /> },
    {
      label: "Conversion",
      value: pct(conversion(now.sales, now.views)),
      sub: "of viewers bought",
      delta: <Delta now={conversion(now.sales, now.views)} before={conversion(before.sales, before.views)} points />,
    },
  ];

  return (
    <main className="bg-apple-gray px-4 pb-16 pt-12">
      <div className="mx-auto max-w-[980px] space-y-8">
        <header>
          <p className="type-caption text-black/50">Writer dashboard</p>
          <h1 className="type-section mt-1">Hi, {firstName(user.display_name)}.</h1>
          <p className="type-sub mt-2 text-black/60">Here’s how your work is doing.</p>
        </header>

        {sample && (
          <p className="type-caption rounded-lg bg-white px-4 py-3 text-black/70">
            ⓘ <strong>Includes sample data.</strong> Views and most sales here are generated test data to show how
            the dashboard works. Real purchases are counted too.
          </p>
        )}

        {/* One filter row above everything it scopes */}
        <nav aria-label="Time range" className="flex items-center gap-2">
          <span className="type-caption mr-1 text-black/50">Period</span>
          {RANGES.map((r) => (
            <Link
              key={r}
              href={`/write?range=${r}`}
              scroll={false}
              aria-current={r === days ? "true" : undefined}
              className={`type-caption rounded-full px-4 py-1.5 ${
                r === days ? "bg-apple-ink font-semibold text-white" : "bg-white text-black/70 hover:text-black"
              }`}
            >
              Last {r} days
            </Link>
          ))}
        </nav>

        {/* KPI row */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div key={kpi.label} className="rounded-xl bg-white p-5 sm:p-6">
              <p className="type-caption text-black/50">{kpi.label}</p>
              <p className="mt-1 text-[28px] font-semibold leading-tight">{kpi.value}</p>
              <p className="type-micro mt-1 text-black/50">{kpi.sub ?? " "}</p>
              <p className="type-micro mt-2">
                {kpi.delta} <span className="text-black/50">vs previous {days} days</span>
              </p>
            </div>
          ))}
        </div>

        <LiveSales initial={writerRecentSales(user.id)} />

        <RevenueChart key={days} days={daily} />

        {/* What's working / needs attention */}
        <div className="grid gap-4 md:grid-cols-2">
          {[
            { title: "What’s working", list: working, empty: "No clear top performer in this period yet." },
            { title: "Needs attention", list: attention, empty: "Nothing stands out negatively. Nice." },
          ].map((box) => (
            <section key={box.title} className="rounded-xl bg-white p-6 sm:p-8">
              <h2 className="type-sub font-semibold">{box.title}</h2>
              {box.list.length === 0 ? (
                <p className="type-caption mt-3 text-black/60">{box.empty}</p>
              ) : (
                <ul className="mt-4 space-y-4">
                  {box.list.map(({ item, status }) => (
                    <li key={item.id}>
                      <Link href={`/articles/${item.id}`} className="font-semibold hover:underline">
                        {item.title}
                      </Link>
                      <p className="type-micro mt-1 text-black/50">
                        {item.views} views · {item.sales} sales · {pct(conversion(item.sales, item.views))} conversion ·{" "}
                        {eur(item.cents)}
                      </p>
                      <p className="type-caption mt-1.5 text-black/70">
                        <span className={TONE_CLASS[status.tone]}>{status.icon}</span> {status.tip}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {/* Every item */}
        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">All stories & podcasts</h2>
          <p className="type-caption mt-1 text-black/60">
            Last {days} days. Conversion = share of viewers who bought (average {pct(avgConversion)}).
          </p>
          <div className="mt-5 overflow-x-auto">
            <table className="type-caption w-full min-w-[720px] text-left">
              <thead className="text-black/50">
                <tr>
                  <th className="py-2 pr-4 font-normal">Title</th>
                  <th className="py-2 pr-4 text-right font-normal">Views</th>
                  <th className="py-2 pr-4 text-right font-normal">Sales</th>
                  <th className="py-2 pr-4 font-normal">Conversion</th>
                  <th className="py-2 pr-4 text-right font-normal">Revenue</th>
                  <th className="py-2 font-normal">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10 tabular-nums">
                {withStatus.map(({ item, status }) => {
                  const conv = conversion(item.sales, item.views);
                  return (
                    <tr key={item.id}>
                      <td className="max-w-[280px] py-3 pr-4">
                        <Link href={`/articles/${item.id}`} className="font-semibold hover:underline">
                          {item.title}
                        </Link>
                        <span className="type-micro block text-black/50">{item.kind === "podcast" ? "Podcast" : "Story"}</span>
                      </td>
                      <td className="py-3 pr-4 text-right">{item.views.toLocaleString("en-GB")}</td>
                      <td className="py-3 pr-4 text-right">{item.sales}</td>
                      <td className="py-3 pr-4">
                        {/* Meter: value + thin bar on a lighter track of the same blue */}
                        <div className="flex items-center gap-2">
                          <span className="w-12 text-right">{pct(conv)}</span>
                          <span className="h-1.5 w-20 overflow-hidden rounded-full bg-[#cde2fb]">
                            <span
                              className="block h-full rounded-full bg-[#0071e3]"
                              style={{ width: `${(conv / maxConversion) * 100}%` }}
                            />
                          </span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right">{eur(item.cents)}</td>
                      <td className={`whitespace-nowrap py-3 ${TONE_CLASS[status.tone]}`}>
                        {status.icon} {status.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <h2 className="type-section pt-6">Manage.</h2>

        {/* Payout wallet */}
        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Payout wallet</h2>
          <p className="type-caption mb-5 mt-1 text-black/60">
            Readers pay directly into this Solana wallet. No platform in between.
          </p>
          <WalletForm current={user.wallet} />
        </section>

        {/* My articles */}
        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Your stories & podcasts</h2>
          {articles.length === 0 ? (
            <p className="type-caption mt-3 text-black/60">Nothing yet. Write your first article below.</p>
          ) : (
            <ul className="mt-4 divide-y divide-black/10">
              {articles.map((article) => (
                <li key={article.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div className="min-w-0">
                    <Link href={`/articles/${article.id}`} className="font-semibold hover:underline">
                      {article.title}
                    </Link>
                    <p className="type-micro mt-1 text-black/50">
                      {article.kind === "podcast" ? "Podcast · " : ""}
                      {formatDate(article.created_at)} · {article.sales} sold in total
                      {!article.published && " · Hidden"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={togglePublished}>
                      <input type="hidden" name="articleId" value={article.id} />
                      <button className="btn-pill">{article.published ? "Hide" : "Publish"}</button>
                    </form>
                    <form action={removeArticle}>
                      <input type="hidden" name="articleId" value={article.id} />
                      <ConfirmButton message={`Delete "${article.title}"?`} className="btn-pill">
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* New article */}
        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Publish something new</h2>
          <p className="type-caption mb-6 mt-1 text-black/60">
            Articles cost readers €0.05, podcasts €0.20. The money goes straight to your payout wallet.
          </p>
          {!user.wallet && (
            <p className="type-caption mb-5 font-semibold">⚠︎ Save a payout wallet above before publishing.</p>
          )}
          <NewArticleForm disabled={!user.wallet} />
        </section>
      </div>
    </main>
  );
}
