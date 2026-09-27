import Link from "next/link";
import { notFound } from "next/navigation";
import UnlockPanel from "@/components/UnlockPanel";
import ViewTracker from "@/components/ViewTracker";
import { getCurrentUser } from "@/lib/auth";
import { formatDate, formatDuration } from "@/lib/format";
import { canRead, getArticle } from "@/lib/queries";

export default async function ArticlePage({ params }: PageProps<"/articles/[id]">) {
  const { id } = await params;
  const article = getArticle(Number(id));
  const user = await getCurrentUser();

  if (!article) notFound();
  // Hidden items stay available to their writer, admins and everyone who bought them.
  const unlocked = canRead(user, article);
  if (!article.published && !unlocked) notFound();
  const isPodcast = article.kind === "podcast";
  const paragraphs = article.body.split(/\n\s*\n/);

  return (
    <main className="bg-white px-4 pb-24 pt-12">
      <ViewTracker articleId={article.id} />
      <article className="mx-auto max-w-[692px]">
        <Link href={isPodcast ? "/?type=podcast" : "/"} className="type-caption text-apple-link hover:underline">
          ‹ {isPodcast ? "All podcasts" : "All stories"}
        </Link>

        {!article.published && (
          <p className="type-caption mt-6 rounded-lg bg-apple-gray px-3 py-2 text-black/70">
            No longer in the shop. You still have access because you bought it or created it.
          </p>
        )}

        <p className="type-micro mt-8 text-black/50">
          {isPodcast && (
            <span className="mr-2 rounded-full bg-apple-ink px-2 py-0.5 text-white">
              Podcast{article.duration_seconds ? ` · ${formatDuration(article.duration_seconds)}` : ""}
            </span>
          )}
          {formatDate(article.created_at)} · {article.writer_name}
        </p>
        <h1 className="type-section mt-3">{article.title}</h1>
        <p className="type-sub mt-4 text-black/70">{article.teaser}</p>

        {!unlocked ? (
          <UnlockPanel
            articleId={article.id}
            kind={article.kind}
            priceCents={article.price_cents}
            writerWallet={article.writer_wallet}
            loggedIn={!!user}
          />
        ) : isPodcast ? (
          <>
            <div className="mt-10 rounded-xl bg-apple-black p-6 sm:p-8">
              <p className="type-caption text-white/60">Now playing</p>
              <p className="type-sub mt-1 font-semibold text-white">{article.title}</p>
              <audio controls preload="metadata" src={`/api/media/${article.id}`} className="mt-5 w-full" />
            </div>
            <h2 className="type-sub mt-12 font-semibold">Transcript & show notes</h2>
            <div className="mt-4 space-y-4 text-[17px] leading-[1.6] text-black/80">
              {paragraphs.map((paragraph, i) => {
                // "Sam: text" → speaker name in bold
                const match = /^(\w{2,12}):\s([\s\S]*)$/.exec(paragraph);
                return match ? (
                  <p key={i}>
                    <strong className="text-apple-ink">{match[1]}:</strong> {match[2]}
                  </p>
                ) : (
                  <p key={i}>{paragraph}</p>
                );
              })}
            </div>
          </>
        ) : (
          <div className="mt-10 space-y-5 text-[19px] leading-[1.6]">
            {paragraphs.map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        )}
      </article>
    </main>
  );
}
