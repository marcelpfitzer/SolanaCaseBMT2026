import Link from "next/link";
import { changeRole, removeArticle, reviewAuthorApplication, togglePublished } from "@/app/actions";
import ConfirmButton from "@/components/ConfirmButton";
import { requireUser } from "@/lib/auth";
import { lamportsToSol } from "@/lib/config";
import { firstName, formatDate, shortAddress } from "@/lib/format";
import { adminListArticles, adminListPurchases, adminListUsers, listApplications, sampleDataCounts } from "@/lib/queries";

export default async function AdminPage() {
  const admin = await requireUser("admin");
  const users = adminListUsers();
  const articles = adminListArticles();
  const purchases = adminListPurchases();
  const volume = lamportsToSol(purchases.reduce((sum, p) => sum + p.lamports, 0));
  const sample = sampleDataCounts();
  const pending = listApplications("pending");
  const decided = [...listApplications("approved"), ...listApplications("rejected")]
    .sort((a, b) => (b.reviewed_at ?? "").localeCompare(a.reviewed_at ?? ""))
    .slice(0, 5);

  return (
    <main className="bg-apple-gray px-4 pb-16 pt-12">
      <div className="mx-auto max-w-[980px] space-y-8">
        <header>
          <p className="type-caption text-black/50">Hi, {firstName(admin.display_name)} · Admin</p>
          <h1 className="type-section mt-1">Overview.</h1>
          {sample.readers > 0 && (
            <p className="type-caption mt-2 text-black/60">
              Real users and purchases only. Not shown: {sample.readers} sample readers and {sample.sales} sample sales
              (generated test data for the writer dashboard).
            </p>
          )}
        </header>

        <div className="grid gap-4 sm:grid-cols-4">
          {[
            { label: "Users", value: String(users.length) },
            { label: "Articles", value: String(articles.length) },
            { label: "Purchases", value: String(purchases.length) },
            { label: "Volume", value: `${volume.toFixed(4)} SOL` },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl bg-white p-6">
              <p className="type-caption text-black/50">{stat.label}</p>
              <p className="type-tile mt-1">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Author applications: nobody writes without an editor's OK */}
        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">
            Author applications{" "}
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-apple-blue px-2 py-0.5 align-middle text-[12px] text-white">
                {pending.length} new
              </span>
            )}
          </h2>
          {pending.length === 0 ? (
            <p className="type-caption mt-3 text-black/60">No applications waiting for review.</p>
          ) : (
            <ul className="mt-4 space-y-6">
              {pending.map((app) => (
                <li key={app.id} className="rounded-lg border border-black/10 p-5">
                  <p className="font-semibold">
                    {app.display_name} <span className="font-normal text-black/50">@{app.username}</span>
                  </p>
                  <p className="type-micro text-black/50">Applied {formatDate(app.created_at)} · Topics: {app.topics}</p>
                  <p className="type-caption mt-3 text-black/80">
                    <strong>Why:</strong> {app.motivation}
                  </p>
                  {app.sample_url && (
                    <p className="type-caption mt-2">
                      <a href={app.sample_url} target="_blank" rel="noreferrer nofollow" className="text-apple-link hover:underline">
                        Previous writing ↗
                      </a>
                    </p>
                  )}
                  <details className="mt-3">
                    <summary className="type-caption cursor-pointer text-apple-link">
                      Read writing sample ({app.sample_text.length} characters)
                    </summary>
                    <p className="type-caption mt-2 whitespace-pre-line rounded-lg bg-apple-gray p-4 text-black/80">
                      {app.sample_text}
                    </p>
                  </details>
                  <form action={reviewAuthorApplication} className="mt-4 flex flex-wrap items-center gap-2">
                    <input type="hidden" name="applicationId" value={app.id} />
                    <input
                      name="note"
                      placeholder="Note to the applicant (optional)"
                      maxLength={500}
                      className="type-caption min-w-[220px] flex-1 rounded-[11px] border border-black/10 px-3 py-2"
                    />
                    <button name="decision" value="approve" className="btn-blue">
                      Approve as author
                    </button>
                    <button name="decision" value="reject" className="btn-pill">
                      Reject
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          {decided.length > 0 && (
            <div className="type-micro mt-5 border-t border-black/10 pt-4 text-black/50">
              Recently decided:{" "}
              {decided.map((app, i) => (
                <span key={app.id}>
                  {i > 0 && " · "}@{app.username} {app.status === "approved" ? "✓ approved" : "✕ rejected"}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Users */}
        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Users</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="type-caption w-full text-left">
              <thead className="text-black/50">
                <tr>
                  <th className="py-2 pr-4 font-normal">Username</th>
                  <th className="py-2 pr-4 font-normal">Name</th>
                  <th className="py-2 pr-4 font-normal">Wallet</th>
                  <th className="py-2 pr-4 font-normal">Articles</th>
                  <th className="py-2 pr-4 font-normal">Bought</th>
                  <th className="py-2 font-normal">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="py-3 pr-4 font-semibold">{user.username}</td>
                    <td className="py-3 pr-4">{user.display_name}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{user.wallet ? shortAddress(user.wallet) : "–"}</td>
                    <td className="py-3 pr-4">{user.articles}</td>
                    <td className="py-3 pr-4">{user.purchases}</td>
                    <td className="py-3">
                      {user.id === admin.id ? (
                        "admin (you)"
                      ) : (
                        <form action={changeRole} className="flex gap-2">
                          <input type="hidden" name="userId" value={user.id} />
                          <select
                            name="role"
                            defaultValue={user.role}
                            className="rounded-[8px] border border-black/10 bg-white px-2 py-1"
                          >
                            <option value="reader">reader</option>
                            <option value="writer">author</option>
                            <option value="admin">admin</option>
                          </select>
                          <button className="text-apple-link hover:underline">Save</button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Articles */}
        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Articles</h2>
          <ul className="mt-4 divide-y divide-black/10">
            {articles.map((article) => (
              <li key={article.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <Link href={`/articles/${article.id}`} className="font-semibold hover:underline">
                    {article.title}
                  </Link>
                  <p className="type-micro mt-1 text-black/50">
                    {article.kind === "podcast" ? "Podcast · " : ""}
                    {article.writer_name} · {formatDate(article.created_at)} · {article.sales} sold
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
        </section>

        {/* Purchases */}
        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Latest purchases</h2>
          {purchases.length === 0 ? (
            <p className="type-caption mt-3 text-black/60">No purchases yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-black/10">
              {purchases.map((p) => (
                <li key={p.signature} className="type-caption flex flex-wrap justify-between gap-2 py-3">
                  <span>
                    <strong>{p.buyer}</strong> bought “{p.article}”
                  </span>
                  <span className="text-black/50">
                    {lamportsToSol(p.lamports).toFixed(6)} SOL ·{" "}
                    <a
                      href={`https://explorer.solana.com/tx/${p.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-apple-link hover:underline"
                    >
                      View on Explorer
                    </a>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
