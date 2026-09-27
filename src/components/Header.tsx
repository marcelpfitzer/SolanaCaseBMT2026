import Image from "next/image";
import Link from "next/link";
import HeaderShell from "@/components/HeaderShell";
import UserMenu from "@/components/UserMenu";
import { getCurrentUser } from "@/lib/auth";

// Sticky glass navigation bar, shown on every page. It shrinks while scrolling (HeaderShell).
// Key sizes are inline styles, so the bar never depends on a stylesheet being up to date.
export default async function Header() {
  const user = await getCurrentUser();

  return (
    <HeaderShell>
      <div
        className="mx-auto flex max-w-[980px] items-center justify-between px-4"
        style={{ height: "var(--bar-h)", gap: 12 }}
      >
        <Link href="/" aria-label="payperread home" style={{ flexShrink: 0, display: "flex" }}>
          <Image
            src="/logo-white.png"
            alt="payperread"
            width={1376}
            height={264}
            priority
            style={{ height: "var(--logo-h)", width: "auto" }}
          />
        </Link>

        {user ? (
          <UserMenu username={user.username} name={user.display_name} avatar={user.avatar} role={user.role} />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link href="/login" className="nav-pill text-white/90 hover:bg-white/10">
              Log in
            </Link>
            <Link href="/signup" className="nav-pill bg-apple-blue text-white hover:bg-[#0077ed]">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </HeaderShell>
  );
}
