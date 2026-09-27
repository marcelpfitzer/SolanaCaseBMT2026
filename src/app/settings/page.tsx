import Link from "next/link";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import WalletStatus from "@/components/WalletStatus";
import { requireUser } from "@/lib/auth";
import NotificationSettings from "./NotificationSettings";

export default async function SettingsPage() {
  const user = await requireUser();

  return (
    <main className="bg-apple-gray px-4 pb-16 pt-12">
      <div className="mx-auto max-w-[692px] space-y-6">
        <header>
          <p className="type-caption text-black/50">Settings</p>
          <h1 className="type-section mt-1">Your account.</h1>
        </header>

        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Wallet</h2>
          <p className="type-caption mb-5 mt-1 text-black/60">
            The wallet you pay for articles with. Use Phantom (set to Devnet) or the Demo Wallet, which needs no
            install. Click the button when connected to copy your address or disconnect.
          </p>
          <div className="wallet-white">
            <ConnectWalletButton />
          </div>
        </section>

        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub mb-4 font-semibold">Balance</h2>
          <WalletStatus />
        </section>

        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub mb-3 font-semibold">Notifications</h2>
          <NotificationSettings />
        </section>

        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub font-semibold">Account</h2>
          <dl className="type-caption mt-4 grid grid-cols-[120px_1fr] gap-y-2">
            <dt className="text-black/50">Username</dt>
            <dd>{user.username}</dd>
            <dt className="text-black/50">Name</dt>
            <dd>{user.display_name}</dd>
            <dt className="text-black/50">Role</dt>
            <dd className="capitalize">{user.role}</dd>
          </dl>
          {(user.role === "writer" || user.role === "admin") && (
            <p className="type-caption mt-4 text-black/60">
              Your payout wallet (where readers pay you) is set in the{" "}
              <Link href="/write" className="text-apple-link hover:underline">
                writer dashboard
              </Link>
              .
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
