"use client";

// The locked box under an article: pay the writer on Solana → server checks → page reloads with full text.

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatEur, priceLamports } from "@/lib/config";
import { memoInstruction } from "@/lib/memo";
import { saveOffline } from "@/lib/offline";
import type { Kind } from "@/lib/db";

type Props = {
  articleId: number;
  kind: Kind;
  priceCents: number;
  writerWallet: string | null;
  loggedIn: boolean;
};

export default function UnlockPanel({ articleId, kind, priceCents, writerWallet, loggedIn }: Props) {
  const router = useRouter();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible: openWalletMenu } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function unlock() {
    if (!writerWallet) return;
    if (!publicKey) {
      openWalletMenu(true);
      return;
    }
    setBusy(true);
    setError(null);

    try {
      // 1. Build the payment: a SOL transfer from the reader straight to the writer.
      const writer = new PublicKey(writerWallet);
      let lamports = priceLamports(priceCents);

      // Solana accounts need a small minimum balance to exist. If the writer's
      // wallet is still empty, this payment tops it up to that minimum.
      const [writerBalance, minimum] = await Promise.all([
        connection.getBalance(writer),
        connection.getMinimumBalanceForRentExemption(0),
      ]);
      if (writerBalance < minimum) lamports = Math.max(lamports, minimum - writerBalance);

      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      const transaction = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight }).add(
        SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: writer, lamports }),
        // Public note on the blockchain: "this payment is for item <id>" = proof of ownership.
        memoInstruction(publicKey, articleId),
      );

      // 2. The wallet signs and sends it (Phantom asks for approval, Demo Wallet signs directly).
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");

      // 3. Our server checks the payment on the blockchain and saves the purchase.
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articleId, wallet: publicKey.toBase58(), signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unlock failed.");

      window.dispatchEvent(new Event("payperread:balance-changed"));
      await saveOffline(articleId, kind).catch(() => {}); // keep a copy on this device
      router.refresh(); // reload the page data from the server → full content appears
    } catch (err) {
      setError(friendlyError(err instanceof Error ? err.message : String(err)));
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 rounded-xl bg-apple-gray p-6 sm:p-8">
      <div aria-hidden className="space-y-2.5">
        <div className="h-2.5 w-full rounded-full bg-black/10" />
        <div className="h-2.5 w-11/12 rounded-full bg-black/10" />
        <div className="h-2.5 w-4/5 rounded-full bg-black/10" />
      </div>

      <p className="type-sub mt-8 font-semibold">
        {kind === "podcast" ? "Listen" : "Keep reading"} for {formatEur(priceCents)}.
      </p>
      <p className="type-caption mt-1 text-black/60">
        One payment, straight to the writer. No subscription.
      </p>

      <div className="mt-5">
        {!loggedIn ? (
          <Link href={`/login?next=/articles/${articleId}`} className="btn-blue inline-block">
            Log in to unlock
          </Link>
        ) : !writerWallet ? (
          <p className="type-caption text-black/60">The writer hasn’t set up payments yet.</p>
        ) : (
          <button onClick={unlock} disabled={busy} className="btn-blue">
            {busy ? "Paying…" : publicKey ? `Unlock for ${formatEur(priceCents)}` : "Connect wallet to unlock"}
          </button>
        )}
      </div>
      {error && <p className="type-caption mt-3 font-semibold text-apple-ink">{error}</p>}
      {loggedIn && (
        <p className="type-micro mt-4 text-black/50">
          Wallet and balance:{" "}
          <Link href="/settings" className="text-apple-link hover:underline">
            Settings
          </Link>
        </p>
      )}
    </div>
  );
}

function friendlyError(message: string): string {
  if (/reject|cancel|denied/i.test(message)) return "Payment cancelled.";
  if (/insufficient|debit an account|no record of a prior credit/i.test(message))
    return "Not enough SOL in your wallet.";
  if (/429|too many requests/i.test(message)) return "Devnet is busy right now. Please try again.";
  return message;
}
