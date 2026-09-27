// Server only: "Restore purchases from wallet".
// Reads the wallet's payment history from the blockchain, finds every payment with a
// "payperread:<id>" memo, checks it, and adds the item to the user's library.

import { createPublicKey, verify } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { priceLamports } from "./config";
import type { User } from "./db";
import { articleIdFromMemo } from "./memo";
import * as q from "./queries";
import { connection, verifyPayment } from "./verifyPayment";

// The text the user's wallet signs. It names the account and wallet, and has a
// timestamp, so a signature can't be reused for someone else or later.
export function restoreMessage(username: string, wallet: string, time: string) {
  return `payperread: restore my purchases\nAccount: ${username}\nWallet: ${wallet}\nTime: ${time}`;
}

// Proof that the user controls the wallet: an Ed25519 signature of the message.
export function isValidWalletSignature(wallet: string, message: string, signatureBase64: string): boolean {
  try {
    const key = createPublicKey({
      key: { kty: "OKP", crv: "Ed25519", x: Buffer.from(new PublicKey(wallet).toBytes()).toString("base64url") },
      format: "jwk",
    });
    return verify(null, Buffer.from(message, "utf8"), key, Buffer.from(signatureBase64, "base64"));
  } catch {
    return false;
  }
}

export type RestoreResult = { found: number; restored: number; alreadyOwned: number; failed: number };

export async function restorePurchases(user: User, wallet: string): Promise<RestoreResult> {
  const history = await connection.getSignaturesForAddress(new PublicKey(wallet), { limit: 200 });
  // The history already includes each transaction's memo, so we only look closer at ours.
  const ours = history.filter((entry) => !entry.err && entry.memo && articleIdFromMemo(entry.memo) !== null);

  const result: RestoreResult = { found: ours.length, restored: 0, alreadyOwned: 0, failed: 0 };

  for (const entry of ours) {
    const article = q.getArticle(articleIdFromMemo(entry.memo!)!);
    if (!article?.writer_wallet) {
      result.failed++;
      continue;
    }
    if (q.hasPurchased(user.id, article.id)) {
      result.alreadyOwned++;
      continue;
    }
    if (q.isSignatureUsed(entry.signature)) {
      result.failed++; // this payment is already linked to another account
      continue;
    }
    // Same checks as a normal purchase (payer, writer, amount, memo).
    const check = await verifyPayment(
      entry.signature,
      wallet,
      article.writer_wallet,
      priceLamports(article.price_cents),
      article.id,
    ).catch(() => ({ error: "Devnet unreachable" }));
    if ("error" in check) {
      result.failed++;
      continue;
    }
    q.savePurchase({
      signature: entry.signature,
      userId: user.id,
      articleId: article.id,
      payerWallet: wallet,
      writerWallet: article.writer_wallet,
      lamports: check.lamports,
    });
    result.restored++;
  }
  return result;
}
