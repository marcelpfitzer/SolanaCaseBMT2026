import Link from "next/link";
import { formatEur } from "@/lib/config";
import type { ArticleSummary } from "@/lib/db";
import { formatDate, formatDuration } from "@/lib/format";

export const TOPIC_NAMES: Record<string, string> = {
  basics: "Basics",
  business: "Business",
  "how-it-works": "How it works",
  journalism: "Journalism",
  payments: "Payments",
  privacy: "Privacy",
  security: "Security",
  solana: "Solana",
  stablecoins: "Stablecoins",
  wallets: "Wallets",
};

// One story or podcast as a card. `reason` = why it's recommended (optional).
export default function ItemCard({
  item,
  unlocked,
  reason,
}: {
  item: ArticleSummary;
  unlocked: boolean;
  reason?: string;
}) {
  const isPodcast = item.kind === "podcast";
  const topic = TOPIC_NAMES[item.topics.split(",")[0]];

  return (
    <Link
      href={`/articles/${item.id}`}
      className={`group flex flex-col rounded-xl p-6 transition-shadow hover:shadow-[3px_5px_30px_rgba(0,0,0,0.12)] sm:p-8 ${
        isPodcast ? "bg-apple-black text-white" : "bg-white"
      }`}
    >
      {reason && (
        <p className={`type-micro mb-3 font-semibold ${isPodcast ? "text-white/80" : "text-black/70"}`}>{reason}</p>
      )}
      <p className={`type-micro ${isPodcast ? "text-white/60" : "text-black/50"}`}>
        {isPodcast && (
          <span className="mr-2 rounded-full bg-white/15 px-2 py-0.5 text-white">
            ▶ Podcast{item.duration_seconds ? ` · ${formatDuration(item.duration_seconds)}` : ""}
          </span>
        )}
        {topic && <span className="mr-1">{topic} ·</span>} {formatDate(item.created_at)} · {item.writer_name}
      </p>
      <h3 className="type-tile mt-3">{item.title}</h3>
      <p className={`type-caption mt-3 flex-1 ${isPodcast ? "text-white/70" : "text-black/70"}`}>{item.teaser}</p>
      <p className={`type-caption mt-5 group-hover:underline ${isPodcast ? "text-apple-link-dark" : "text-apple-link"}`}>
        {unlocked
          ? isPodcast
            ? "Listen now ›"
            : "Read now ›"
          : `${isPodcast ? "Listen" : "Read"} for ${formatEur(item.price_cents)} ›`}
      </p>
    </Link>
  );
}
