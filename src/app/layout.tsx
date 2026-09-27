import type { Metadata } from "next";
import Header from "@/components/Header";
import OfflineSupport from "@/components/OfflineSupport";
import SolanaWalletProvider from "@/components/SolanaWalletProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayPerRead",
  description: "Pay €0.05 per article on Solana Devnet. No subscription.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full">
      <body className="flex min-h-full flex-col">
        <SolanaWalletProvider>
          <Header />
          <OfflineSupport />
          <div className="flex-1">{children}</div>
          <footer className="bg-apple-gray px-4 pb-10 pt-6">
            <p className="type-micro mx-auto max-w-[980px] border-t border-black/10 pt-4 text-black/50">
              PayPerRead · Hackathon prototype on Solana Devnet · test tokens only, no real money
            </p>
          </footer>
        </SolanaWalletProvider>
      </body>
    </html>
  );
}
