import Link from "next/link";
import FilterTabs from "@/components/FilterTabs";
import { requireUser } from "@/lib/auth";
import { formatEur, lamportsToSol } from "@/lib/config";
import { formatDate, formatDuration, shortAddress } from "@/lib/format";
import { listLibrary } from "@/lib/queries";
import { DownloadAll, OfflineButton } from "./OfflineControls";
import RestorePurchases from "./RestorePurchases";

export default async function LibraryPage() {
  const user = await requireUser();
  const items = listLibrary(user.id);

  return (
    <main className="bg-apple-gray px-4 pb-16 pt-12">
      <div className="mx-auto max-w-[980px] space-y-8">
        <div className="flex justify-end">
          <FilterTabs current="library" showLibrary />
        </div>
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="type-caption text-black/50">Your library</p>
            <h1 className="type-section mt-1">Yours to keep.</h1>
            <p className="type-caption mt-2 max-w-[560px] text-black/60">
              Everything you bought, saved on this device for offline reading and listening. Every purchase is also
              recorded on the Solana blockchain as proof that it’s yours.
            </p>
          </div>
          <DownloadAll items={items.map(({ id, kind }) => ({ id, kind }))} />
        </header>

        {items.length === 0 ? (
          <section className="rounded-xl bg-white p-8 text-center">
            <p className="type-sub font-semibold">Nothing here yet.</p>
            <p className="type-caption mt-2 text-black/60">
              Stories and podcasts you buy appear here and are saved for offline use automatically.
            </p>
            <Link href="/" className="btn-blue mt-6 inline-block">
              Browse stories
            </Link>
          </section>
        ) : (
          <ul className="space-y-4">
            {items.map((item) => (
              <li key={item.signature} className="rounded-xl bg-white p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="type-micro text-black/50">
                      {item.kind === "podcast" && (
                        <span className="mr-2 rounded-full bg-apple-ink px-2 py-0.5 text-white">
                          ▶ Podcast{item.duration_seconds ? ` · ${formatDuration(item.duration_seconds)}` : ""}
                        </span>
                      )}
                      {item.writer_name}
                    </p>
                    {/* A plain link (not <Link>) so it also opens from the offline copy. */}
                    <a href={`/articles/${item.id}`} className="type-tile mt-2 block hover:underline">
                      {item.title}
                    </a>
                  </div>
                  <OfflineButton item={{ id: item.id, kind: item.kind }} />
                </div>

                {/* The receipt: this purchase on the blockchain */}
                <div className="type-micro mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-black/10 pt-4 text-black/50">
                  <span>Bought {formatDate(item.bought_at)}</span>
                  <span>
                    {formatEur(item.price_cents)} · {lamportsToSol(item.lamports).toFixed(6)} SOL
                  </span>
                  <span>From wallet {shortAddress(item.payer_wallet)}</span>
                  <a
                    href={`https://explorer.solana.com/tx/${item.signature}?cluster=devnet`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-apple-link hover:underline"
                  >
                    Proof of purchase on Solana ↗
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Why this is really yours</h2>
          <ul className="type-caption mt-3 list-disc space-y-1.5 pl-5 text-black/70">
            <li>
              Each payment carries a public note on the blockchain (“payperread:&lt;item&gt;”). It proves forever
              that your wallet bought that item, even if our database were lost.
            </li>
            <li>Bought items are never removed from your library, even if the creator takes them off the shop.</li>
            <li>Downloaded copies stay on this device and work without internet. They’re removed when you log out.</li>
          </ul>
          <div className="mt-6 border-t border-black/10 pt-5">
            <p className="type-caption mb-3 text-black/60">
              Missing something, or using a new account? Connect the wallet you paid with and restore everything it
              bought from the blockchain.
            </p>
            <RestorePurchases username={user.username} />
          </div>
        </section>
      </div>
    </main>
  );
}
