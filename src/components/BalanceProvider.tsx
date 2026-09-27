"use client";

// Keeps the connected wallet's balance up to date for the whole app, and sends a
// notification whenever it drops below €1.

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import Link from "next/link";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { EUR_PER_SOL, lamportsToSol } from "@/lib/config";

export const LOW_BALANCE_EUR = 1;
const LOW_BALANCE_LAMPORTS = Math.round((LOW_BALANCE_EUR / EUR_PER_SOL) * 1_000_000_000);

type BalanceContextValue = {
  lamports: number | null; // null = no wallet or still loading
  refresh: () => Promise<void>;
};

const BalanceContext = createContext<BalanceContextValue>({ lamports: null, refresh: async () => {} });
export const useBalance = () => useContext(BalanceContext);

export const lamportsToEur = (lamports: number) => lamportsToSol(lamports) * EUR_PER_SOL;

export default function BalanceProvider({ children }: { children: React.ReactNode }) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

  // Remember which wallet a balance belongs to, so we never show a stale one.
  const [state, setState] = useState<{ wallet: string; lamports: number } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const wasLow = useRef<Record<string, boolean>>({});

  const handleBalance = useCallback((forWallet: string, lamports: number) => {
    setState({ wallet: forWallet, lamports });

    // Notify only when the balance *crosses* below €1 (not on every refresh).
    const isLow = lamports < LOW_BALANCE_LAMPORTS;
    if (isLow && !wasLow.current[forWallet]) {
      const message = `Your wallet balance is below €${LOW_BALANCE_EUR} (≈ €${lamportsToEur(lamports).toFixed(2)}). Top up to keep reading.`;
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("payperread: low balance", { body: message, icon: "/icon.png" });
      } else {
        setToast(message); // no permission: show it inside the page instead
      }
    }
    wasLow.current[forWallet] = isLow;
  }, []);

  const refresh = useCallback(async () => {
    if (!publicKey || !wallet) return;
    handleBalance(wallet, await connection.getBalance(publicKey));
  }, [connection, publicKey, wallet, handleBalance]);

  // Load the balance, then listen for changes on the blockchain.
  useEffect(() => {
    if (!publicKey || !wallet) return;
    connection
      .getBalance(publicKey)
      .then((lamports) => handleBalance(wallet, lamports))
      .catch(() => {});
    const id = connection.onAccountChange(publicKey, (account) => handleBalance(wallet, account.lamports));
    const onChanged = () => refresh().catch(() => {});
    window.addEventListener("payperread:balance-changed", onChanged);
    return () => {
      connection.removeAccountChangeListener(id).catch(() => {});
      window.removeEventListener("payperread:balance-changed", onChanged);
    };
  }, [connection, publicKey, wallet, handleBalance, refresh]);

  const lamports = state && state.wallet === wallet ? state.lamports : null;

  return (
    <BalanceContext.Provider value={{ lamports, refresh }}>
      {children}
      {toast && (
        <div
          role="status"
          className="fixed bottom-4 right-4 left-4 z-50 mx-auto max-w-sm rounded-xl bg-white p-5 shadow-[3px_5px_30px_rgba(0,0,0,0.22)] sm:left-auto"
        >
          <p className="type-caption font-semibold">Low balance</p>
          <p className="type-caption mt-1 text-black/70">{toast}</p>
          <div className="mt-3 flex gap-4">
            <Link href="/settings" onClick={() => setToast(null)} className="type-caption text-apple-link hover:underline">
              Open settings
            </Link>
            <button onClick={() => setToast(null)} className="type-caption text-black/50 hover:text-black">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </BalanceContext.Provider>
  );
}
