import Link from "next/link";
import { changeRole, removeArticle, togglePublished } from "@/app/actions";
import ConfirmButton from "@/components/ConfirmButton";
import { requireUser } from "@/lib/auth";
import { lamportsToSol } from "@/lib/config";
import { formatDate, shortAddress } from "@/lib/format";
import { adminListArticles, adminListPurchases, adminListUsers, sampleDataCounts } from "@/lib/queries";

export default async function AdminPage() {
  const admin = await requireUser("admin");
  const users = adminListUsers();
  const articles = adminListArticles();
  const purchases = adminListPurchases();
  const volume = lamportsToSol(purchases.reduce((sum, p) => sum + p.lamports, 0));
  const sample = sampleDataCounts();

  return (
    <main className="bg-apple-gray px-4 pb-16 pt-12">
      <div className="mx-auto max-w-[980px] space-y-8">
        <header>
          <p className="type-caption text-black/50">Admin</p>
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
                            <option value="writer">writer</option>
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
