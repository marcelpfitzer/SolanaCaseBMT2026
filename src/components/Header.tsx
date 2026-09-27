import Image from "next/image";
import Link from "next/link";
import UserMenu from "@/components/UserMenu";
import { getCurrentUser } from "@/lib/auth";

// Sticky glass navigation bar, shown on every page.
export default async function Header() {
  const user = await getCurrentUser();

  return (
    <nav className="sticky top-0 z-20 bg-black/80 backdrop-blur-xl backdrop-saturate-[180%]">
      <div className="mx-auto flex h-12 max-w-[980px] items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="payperread home" className="shrink-0">
          <Image src="/logo-white.png" alt="payperread" width={1376} height={264} priority className="h-[22px] w-auto" />
        </Link>

        {user ? (
          <UserMenu username={user.username} displayName={user.display_name} role={user.role} />
        ) : (
          <div className="flex items-center gap-2">
            <Link href="/login" className="nav-pill text-white/90 hover:bg-white/10">
              Log in
            </Link>
            <Link href="/signup" className="nav-pill bg-apple-blue text-white hover:bg-[#0077ed]">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
