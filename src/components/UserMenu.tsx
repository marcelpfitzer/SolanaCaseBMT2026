"use client";

// The round avatar button in the header with a dropdown: Write, Admin, Settings, Log out.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions";
import { clearOffline } from "@/lib/offline";
import type { Role } from "@/lib/db";

type Props = { username: string; displayName: string; role: Role };

export default function UserMenu({ username, displayName, role }: Props) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside or pressing Escape.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);
  const itemClass = "block w-full px-4 py-2 text-left text-[14px] text-apple-ink hover:bg-apple-gray";

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex h-8 items-center gap-2 rounded-full py-1 pl-1 pr-3 text-[12px] text-white/90 hover:bg-white/10"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-apple-blue text-[12px] font-semibold text-white">
          {displayName.charAt(0).toUpperCase()}
        </span>
        <span className="max-w-[120px] truncate">{username}</span>
        <span aria-hidden className={`text-[10px] transition-transform ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl bg-white py-2 shadow-[3px_5px_30px_rgba(0,0,0,0.22)]"
        >
          <div className="px-4 pb-3 pt-1">
            <p className="text-[14px] font-semibold text-apple-ink">{displayName}</p>
            <p className="type-micro text-black/50">
              @{username} · {role}
            </p>
          </div>
          <div className="border-t border-black/10 py-1">
            <a href="/library" onClick={close} className={itemClass} role="menuitem">
              Library
            </a>
            {(role === "writer" || role === "admin") && (
              <Link href="/write" onClick={close} className={itemClass} role="menuitem">
                Writer dashboard
              </Link>
            )}
            {role === "admin" && (
              <Link href="/admin" onClick={close} className={itemClass} role="menuitem">
                Admin
              </Link>
            )}
            <Link href="/settings" onClick={close} className={itemClass} role="menuitem">
              Settings · wallet & balance
            </Link>
          </div>
          {/* Logging out also removes the offline copies from this device. */}
          <form
            action={async () => {
              await clearOffline().catch(() => {});
              await logout();
            }}
            className="border-t border-black/10 pt-1"
          >
            <button className={itemClass} role="menuitem">
              Log out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
