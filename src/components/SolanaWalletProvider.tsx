"use client";

// Gives every component access to the Solana connection and the user's wallet.

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";
import { useMemo } from "react";
import BalanceProvider from "@/components/BalanceProvider";
import { DemoWalletAdapter } from "@/lib/DemoWalletAdapter";
import "@solana/wallet-adapter-react-ui/styles.css";

// We only use DEVNET (test network, no real money).
const endpoint = clusterApiUrl("devnet");

// If Devnet says "too many requests" (429), fail right away instead of retrying
// 4 times and printing an error each time. Our UI shows a friendly message instead.
const connectionConfig = { commitment: "confirmed" as const, disableRetryOnRateLimit: true };

export default function SolanaWalletProvider({ children }: { children: React.ReactNode }) {
  // Phantom announces itself automatically (Wallet Standard), so we only list our Demo Wallet.
  const wallets = useMemo(() => [new DemoWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint} config={connectionConfig}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <BalanceProvider>{children}</BalanceProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
