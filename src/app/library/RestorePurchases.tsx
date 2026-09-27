"use client";

// "Restore purchases from wallet": the wallet signs a message to prove it's yours,
// then the server reads your payments from the blockchain and re-adds them.

import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

// Must match restoreMessage() in src/lib/restore.ts exactly.
const message = (username: string, wallet: string, time: string) =>
  `payperread: restore my purchases\nAccount: ${username}\nWallet: ${wallet}\nTime: ${time}`;

export default function RestorePurchases({ username }: { username: string }) {
  const router = useRouter();
  const { publicKey, signMessage } = useWallet();
  const { setVisible: openWalletMenu } = useWalletModal();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function restore() {
    if (!publicKey) return openWalletMenu(true);
    if (!signMessage) return setResult("This wallet can't sign messages.");
    setBusy(true);
    setResult(null);
    try {
      const wallet = publicKey.toBase58();
      const time = new Date().toISOString();
      const signature = await signMessage(new TextEncoder().encode(message(username, wallet, time)));
      const res = await fetch("/api/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, time, signature: btoa(String.fromCharCode(...signature)) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(
        data.found === 0
          ? "No payperread purchases found in this wallet’s history."
          : `Found ${data.found} purchase${data.found === 1 ? "" : "s"} on the blockchain: ${data.restored} restored, ${data.alreadyOwned} already in your library${data.failed ? `, ${data.failed} couldn’t be verified` : ""}.`,
      );
      if (data.restored > 0) router.refresh();
    } catch (error) {
      const text = error instanceof Error ? error.message : String(error);
      setResult(/reject|cancel|denied/i.test(text) ? "Cancelled." : text);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={restore} disabled={busy} className="btn-pill">
        {busy ? "Checking the blockchain…" : publicKey ? "Restore purchases from wallet" : "Connect wallet to restore"}
      </button>
      {result && <p className="type-caption mt-3 text-black/70">{result}</p>}
    </div>
  );
}
