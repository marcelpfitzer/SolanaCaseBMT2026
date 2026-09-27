// Every payment carries a short public note ("memo") saying what it pays for,
// e.g. "payperread:7". That way the blockchain itself records forever that
// this wallet bought item 7, independent of our database.

import { PublicKey, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

// Solana's official Memo program.
export const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr");

export const memoFor = (articleId: number) => `payperread:${articleId}`;

// "payperread:7" → 7 (or null if it's not one of ours)
export function articleIdFromMemo(memo: string): number | null {
  const match = /payperread:(\d+)/.exec(memo);
  return match ? Number(match[1]) : null;
}

export function memoInstruction(payer: PublicKey, articleId: number) {
  return new TransactionInstruction({
    programId: MEMO_PROGRAM_ID,
    keys: [{ pubkey: payer, isSigner: true, isWritable: false }],
    data: Buffer.from(memoFor(articleId), "utf8"),
  });
}
