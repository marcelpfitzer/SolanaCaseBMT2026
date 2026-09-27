"use client";

import dynamic from "next/dynamic";

// The wallet button only works in the browser, so we skip server rendering for it.
const BaseWalletMultiButton = dynamic(
  () => import("@solana/wallet-adapter-react-ui").then((mod) => mod.BaseWalletMultiButton),
  { ssr: false },
);

// Our own button texts. When connected, the button shows the wallet address.
const LABELS = {
  "change-wallet": "Change wallet",
  connecting: "Connecting…",
  "copy-address": "Copy address",
  copied: "Copied",
  disconnect: "Disconnect",
  "has-wallet": "Connect wallet",
  "no-wallet": "Connect wallet",
};

export default function ConnectWalletButton() {
  return <BaseWalletMultiButton labels={LABELS} />;
}
