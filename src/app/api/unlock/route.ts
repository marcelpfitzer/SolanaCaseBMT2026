// POST /api/unlock  { articleId, wallet, signature }
// Needs a login. Checks the payment on Devnet and saves the purchase for this account.

import { getCurrentUser } from "@/lib/auth";
import { priceLamports } from "@/lib/config";
import * as q from "@/lib/queries";
import { verifyPayment } from "@/lib/verifyPayment";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });

  const { articleId, wallet, signature } = await request.json().catch(() => ({}));
  if (typeof articleId !== "number" || typeof wallet !== "string" || typeof signature !== "string") {
    return Response.json({ error: "articleId, wallet and signature are required." }, { status: 400 });
  }

  const article = q.getArticle(articleId);
  if (!article || !article.published) {
    return Response.json({ error: "Article not found." }, { status: 404 });
  }
  if (!article.writer_wallet) {
    return Response.json({ error: "The writer has no payout wallet yet." }, { status: 409 });
  }
  if (q.canRead(user, article)) return Response.json({ ok: true }); // already unlocked

  // Each payment can only unlock one article once.
  if (q.isSignatureUsed(signature)) {
    return Response.json({ error: "This payment was already used." }, { status: 409 });
  }

  const result = await verifyPayment(
    signature,
    wallet,
    article.writer_wallet,
    priceLamports(article.price_cents),
    article.id,
  ).catch(() => ({
    error: "Could not reach Devnet. Please try again.",
  }));
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: 402 }); // 402 = Payment Required
  }

  q.savePurchase({
    signature,
    userId: user.id,
    articleId: article.id,
    payerWallet: wallet,
    writerWallet: article.writer_wallet,
    lamports: result.lamports,
  });
  return Response.json({ ok: true });
}
