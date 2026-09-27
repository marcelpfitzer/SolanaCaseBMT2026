"use client";

// "Latest sales · live": checks for new purchases every few seconds. A new real purchase
// pops up as a notice, is highlighted in the list, and the dashboard numbers refresh.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { RecentSale } from "@/lib/queries";

const POLL_MS = 4000;
const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const toDate = (sqlite: string) => new Date(sqlite.replace(" ", "T") + "Z");

function timeAgo(sqlite: string, now: number) {
  const seconds = Math.max(0, Math.round((now - toDate(sqlite).getTime()) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return `${Math.floor(seconds / 86400)} d ago`;
}

export default function LiveSales({ initial }: { initial: RecentSale[] }) {
  const router = useRouter();
  const [sales, setSales] = useState(initial);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<RecentSale | null>(null);
  const [now, setNow] = useState<number | null>(null); // set in the browser only (no server/client mismatch)
  const known = useRef(new Set(initial.map((s) => s.signature)));

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const clock = setInterval(tick, 15000);

    const poll = setInterval(async () => {
      const res = await fetch("/api/writer/sales", { cache: "no-store" }).catch(() => null);
      if (!res?.ok) return;
      const { sales: latest } = (await res.json()) as { sales: RecentSale[] };
      const added = latest.filter((s) => !known.current.has(s.signature));
      if (added.length === 0) return;
      added.forEach((s) => known.current.add(s.signature));
      setSales(latest);
      setFresh(new Set(added.map((s) => s.signature)));
      const real = added.find((s) => !s.is_sample);
      if (real) {
        setToast(real);
        setTimeout(() => setToast(null), 8000);
      }
      router.refresh(); // update KPIs, chart and table too
    }, POLL_MS);

    return () => {
      clearTimeout(first);
      clearInterval(clock);
      clearInterval(poll);
    };
  }, [router]);

  return (
    <section className="rounded-xl bg-white p-6 sm:p-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="type-sub font-semibold">Latest sales</h2>
        <span className="type-micro flex items-center gap-1.5 text-black/50">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#0ca30c] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[#0ca30c]" />
          </span>
          Live
        </span>
      </div>

      {sales.length === 0 ? (
        <p className="type-caption mt-3 text-black/60">No sales yet. They appear here the moment someone buys.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/10">
          {sales.map((sale) => (
            <li
              key={sale.signature}
              className={`flex flex-wrap items-baseline justify-between gap-2 py-3 transition-colors duration-1000 ${
                fresh.has(sale.signature) ? "fade-in -mx-3 rounded-lg bg-[#cde2fb]/60 px-3" : ""
              }`}
            >
              <span className="type-caption min-w-0">
                <strong>{sale.buyer}</strong>
                {sale.is_sample ? <span className="text-black/40"> (sample)</span> : null} bought{" "}
                <Link href={`/articles/${sale.article_id}`} className="hover:underline">
                  “{sale.title}”
                </Link>
              </span>
              <span className="type-micro whitespace-nowrap text-black/50">
                {eur(sale.price_cents)} · {now ? timeAgo(sale.created_at, now) : ""}
                {!sale.is_sample && (
                  <>
                    {" · "}
                    <a
                      href={`https://explorer.solana.com/tx/${sale.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-apple-link hover:underline"
                    >
                      on Solana ↗
                    </a>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Pop-up for a new real sale */}
      {toast && (
        <div
          role="status"
          className="fade-in fixed right-4 top-16 z-50 w-[320px] rounded-xl bg-white p-4 shadow-[3px_5px_30px_rgba(0,0,0,0.22)]"
        >
          <p className="type-caption font-semibold">💸 New sale · {eur(toast.price_cents)}</p>
          <p className="type-caption mt-1 text-black/70">
            <strong>{toast.buyer}</strong> just bought “{toast.title}”. The money is already in your wallet.
          </p>
        </div>
      )}
    </section>
  );
}
