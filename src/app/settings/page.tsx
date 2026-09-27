import Link from "next/link";
import ConnectWalletButton from "@/components/ConnectWalletButton";
import WalletStatus from "@/components/WalletStatus";
import { listAvatarIcons } from "@/lib/avatars";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { latestApplication } from "@/lib/queries";
import AuthorApplicationForm from "./AuthorApplicationForm";
import NotificationSettings from "./NotificationSettings";
import ProfileSettings from "./ProfileSettings";

export default async function SettingsPage() {
  const user = await requireUser();
  const application = user.role === "reader" ? latestApplication(user.id) : null;

  return (
    <main className="bg-apple-gray px-4 pb-16 pt-12">
      <div className="mx-auto max-w-[692px] space-y-6">
        <header>
          <p className="type-caption text-black/50">Settings</p>
          <h1 className="type-section mt-1">Your account.</h1>
        </header>

        <section className="rounded-xl bg-white p-6 sm:p-8">
          <h2 className="type-sub mb-5 font-semibold">Profile</h2>
          <ProfileSettings
            name={user.display_name}
            avatar={user.avatar}
            icons={listAvatarIcons()}
          />
        </section>

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
            <dt className="text-black/50">Role</dt>
            <dd className="capitalize">{user.role === "writer" ? "Author" : user.role}</dd>
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

        {/* Readers can apply to write. Editors (admins) review every application. */}
        {user.role === "reader" && (
          <section id="author" className="scroll-mt-20 rounded-xl bg-white p-6 sm:p-8">
            <h2 className="type-sub font-semibold">Become an author</h2>
            {application?.status === "pending" ? (
              <p className="type-caption mt-3 text-black/70">
                ⏳ <strong>Your application is in review</strong> (sent {formatDate(application.created_at)}). An editor
                reads every sample. You’ll get author access here once it’s approved.
              </p>
            ) : (
              <>
                <p className="type-caption mb-6 mt-1 text-black/60">
                  Authors publish stories and podcasts and get paid directly by readers. To keep quality high, every
                  author is reviewed by an editor first: tell us about yourself and share a writing sample.
                </p>
                {application?.status === "rejected" && (
                  <p className="type-caption mb-6 rounded-lg bg-apple-gray px-4 py-3 text-black/70">
                    Your last application ({formatDate(application.created_at)}) wasn’t approved.
                    {application.admin_note && (
                      <>
                        {" "}
                        Editor’s note: “{application.admin_note}”
                      </>
                    )}{" "}
                    You’re welcome to apply again.
                  </p>
                )}
                <AuthorApplicationForm />
              </>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
