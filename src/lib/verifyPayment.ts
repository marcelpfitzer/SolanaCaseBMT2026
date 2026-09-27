// Server only: checks on the blockchain that a payment really happened.

import { Connection, clusterApiUrl, type ParsedInstruction } from "@solana/web3.js";
import { articleIdFromMemo } from "./memo";

export const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

// A valid payment: from payerWallet to writerWallet, at least minLamports,
// with the memo "payperread:<articleId>". Returns the amount or an error message.
export async function verifyPayment(
  signature: string,
  payerWallet: string,
  writerWallet: string,
  minLamports: number,
  articleId: number,
): Promise<{ lamports: number } | { error: string }> {
  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });

  if (!tx) return { error: "Transaction not found on Devnet (yet)." };
  if (tx.meta?.err) return { error: "Transaction failed on the blockchain." };

  let paid: number | null = null;
  let memoMatches = false;

  for (const ix of tx.transaction.message.instructions) {
    if (!("parsed" in ix)) continue;
    const { program, parsed } = ix as ParsedInstruction;

    // The SOL transfer: reader → writer, at least the price.
    if (
      program === "system" &&
      parsed.type === "transfer" &&
      parsed.info.source === payerWallet &&
      parsed.info.destination === writerWallet &&
      parsed.info.lamports >= minLamports
    ) {
      paid = parsed.info.lamports;
    }

    // The memo: which item this payment is for.
    if (program === "spl-memo" && typeof parsed === "string" && articleIdFromMemo(parsed) === articleId) {
      memoMatches = true;
    }
  }

  if (paid === null) return { error: "This transaction is not a valid payment for this item." };
  if (!memoMatches) return { error: "This payment is for a different item." };
  return { lamports: paid };
}
