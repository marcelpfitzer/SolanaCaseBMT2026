"use client";

// Profile picture + first name in the header, with a dropdown: Library, Write, Admin, Settings, Log out.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { logout } from "@/app/actions";
import Avatar from "@/components/Avatar";
import { firstName } from "@/lib/format";
import { clearOffline } from "@/lib/offline";
import type { Role } from "@/lib/db";

type Props = {
  username: string;
  name: string;
  avatar: string | null;
  role: Role;
};

export default function UserMenu({ username, name, avatar, role }: Props) {
  const shownName = firstName(name); // compact: "Daniel Müller" → "Daniel"
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
        className="rounded-full text-white/90 hover:bg-white/10"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          height: 40,
          padding: "4px 12px 4px 4px",
          fontSize: 15,
          letterSpacing: "-0.24px",
        }}
      >
        <Avatar avatar={avatar} name={shownName} size={32} />
        <span data-name className="hidden truncate font-medium sm:inline" style={{ maxWidth: 160 }}>
          {shownName}
        </span>
        <svg
          aria-hidden
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={`text-white/70 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-60 overflow-hidden rounded-xl bg-white py-2 shadow-[3px_5px_30px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-center gap-3 px-4 pb-3 pt-1">
            <Avatar avatar={avatar} name={shownName} size={40} />
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold text-apple-ink">{name}</p>
              <p className="type-micro text-black/50">
                @{username} · {role === "writer" ? "author" : role}
              </p>
            </div>
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
            {role === "reader" && (
              <Link href="/settings#author" onClick={close} className={itemClass} role="menuitem">
                Become an author
              </Link>
            )}
            <Link href="/settings" onClick={close} className={itemClass} role="menuitem">
              Settings · profile & wallet
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
