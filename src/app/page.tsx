import Link from "next/link";
import FilterTabs from "@/components/FilterTabs";
import ItemCard from "@/components/ItemCard";
import { getCurrentUser } from "@/lib/auth";
import { PRICE_CENTS, formatEur } from "@/lib/config";
import { firstName } from "@/lib/format";
import { canRead, listPublishedArticles, popularItems, recommendationsFor } from "@/lib/queries";

const FILTERS = [
  { type: undefined, label: "All", heading: "Latest." },
  { type: "article", label: "Stories", heading: "Latest stories." },
  { type: "podcast", label: "Podcasts", heading: "Podcasts." },
] as const;

export default async function Home({ searchParams }: PageProps<"/">) {
  const { type } = await searchParams;
  const filter = FILTERS.find((f) => f.type === type) ?? FILTERS[0];
  const user = await getCurrentUser();
  const items = listPublishedArticles(filter.type);

  // Top of the page: personal picks if we know what you like, otherwise what's popular.
  const personal = user ? recommendationsFor(user, 3) : [];
  const picks = personal.length > 0 ? personal : popularItems(3);
  const picksHeading = personal.length > 0 ? "Picked for you." : "Popular right now.";

  return (
    <>
      {user ? (
        // Logged in: a short greeting, so the content starts right away.
        <section className="bg-apple-black px-4 text-white" style={{ paddingTop: 40, paddingBottom: 64 }}>
          <div className="mx-auto max-w-[980px]">
            <p className="type-caption text-white/60">Welcome back</p>
            <h1 className="type-section mt-1">{firstName(user.display_name)}.</h1>
            <p className="type-sub mt-3 text-white/70">
              {personal.length > 0
                ? "New stories and podcasts that match what you’ve been reading."
                : "Start with what other readers love right now."}
            </p>
          </div>
        </section>
      ) : (
        <section className="bg-apple-black px-4 text-center text-white" style={{ paddingTop: 56, paddingBottom: 88 }}>
          <h1 className="type-hero mx-auto max-w-[780px]">Read what matters. Pay for just that.</h1>
          <p className="type-sub mx-auto mt-4 max-w-[640px] text-white/80">
            Stories for {formatEur(PRICE_CENTS.article)}, podcasts for {formatEur(PRICE_CENTS.podcast)}. Straight to
            the creator. No subscription.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/login" className="btn-blue">
              Log in
            </Link>
            <Link
              href="/signup"
              className="btn-pill border-apple-link-dark text-apple-link-dark"
              style={{ fontSize: 17, padding: "8px 18px", display: "inline-flex", alignItems: "center" }}
            >
              Create account
            </Link>
          </div>
          <p className="type-micro mt-8 text-white/50">Demo on Solana Devnet · test tokens only, no real money</p>
        </section>
      )}

      <main className="bg-apple-gray px-4 pb-16 pt-14">
        <div className="mx-auto max-w-[980px]">
          {/* Recommendations */}
          {picks.length > 0 && (
            <section className="mb-16">
              <h2 className="type-section mb-2">{picksHeading}</h2>
              <p className="type-caption mb-8 text-black/60">
                {personal.length > 0
                  ? "Based on the topics of what you bought."
                  : user
                    ? "Buy a story or podcast and we’ll tailor this to your interests."
                    : "What readers are buying this week."}
              </p>
              <div className="grid gap-6 md:grid-cols-3">
                {picks.map((item) => (
                  <ItemCard key={item.id} item={item} unlocked={canRead(user, item)} reason={item.reason} />
                ))}
              </div>
            </section>
          )}

          {/* Everything, filterable */}
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <h2 className="type-section">{filter.heading}</h2>
            <FilterTabs current={filter.type ?? ""} showLibrary={!!user} />
          </div>

          {items.length === 0 && <p className="text-black/60">Nothing published here yet.</p>}

          {/* key = new list per filter → it fades in instead of popping */}
          <div key={filter.label} className="fade-in grid gap-6 sm:grid-cols-2">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} unlocked={canRead(user, item)} />
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
