"use client";

// Settings: the connected wallet's balance, plus help to get free test SOL.

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { useState } from "react";
import { LOW_BALANCE_EUR, lamportsToEur, useBalance } from "@/components/BalanceProvider";
import { lamportsToSol } from "@/lib/config";

export default function WalletStatus() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { lamports, refresh } = useBalance();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!publicKey) {
    return <p className="type-caption text-black/60">Connect a wallet above to see your balance.</p>;
  }
  const address = publicKey.toBase58();

  async function getTestSol() {
    if (!publicKey) return;
    setBusy(true);
    setError(null);
    try {
      const signature = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
      await connection.confirmTransaction(signature, "confirmed");
      await refresh();
    } catch {
      // The public Devnet faucet is heavily rate-limited (HTTP 429).
      setError("The free Devnet faucet is rate-limited right now.");
    } finally {
      setBusy(false);
    }
  }

  const low = lamports !== null && lamportsToEur(lamports) < LOW_BALANCE_EUR;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="type-tile">{lamports === null ? "…" : `${lamportsToSol(lamports).toFixed(4)} SOL`}</p>
          {lamports !== null && (
            <p className="type-caption mt-1 text-black/50">
              ≈ €{lamportsToEur(lamports).toFixed(2)} · enough for {Math.floor(lamportsToEur(lamports) / 0.05)} articles
            </p>
          )}
        </div>
        <button onClick={getTestSol} disabled={busy} className="btn-pill">
          {busy ? "Requesting…" : "Get 1 test SOL"}
        </button>
      </div>

      {low && !error && (
        <p className="type-caption mt-4 font-semibold">⚠︎ Below €{LOW_BALANCE_EUR}. Top up to keep reading.</p>
      )}

      {error && (
        <div className="type-caption mt-6 border-t border-black/10 pt-5 text-black/80">
          <p className="font-semibold text-apple-ink">{error}</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              Copy your address:{" "}
              <button
                onClick={() => navigator.clipboard?.writeText(address)}
                className="break-all rounded-[5px] bg-apple-gray px-1.5 py-0.5 font-mono text-xs hover:bg-[#ededf2]"
                title="Click to copy"
              >
                {address}
              </button>
            </li>
            <li>
              Paste it at{" "}
              <a
                href="https://faucet.solana.com"
                target="_blank"
                rel="noreferrer"
                className="text-apple-link hover:underline"
              >
                faucet.solana.com
              </a>{" "}
              (log in with GitHub for higher limits), choose Devnet, request SOL.
            </li>
            <li>The balance here updates automatically when the SOL arrives.</li>
          </ol>
        </div>
      )}
    </div>
  );
}
