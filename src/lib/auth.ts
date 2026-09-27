// Login sessions (server only). The browser gets a random token in an httpOnly
// cookie; the database stores only a hash of it.

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db, type Role, type User } from "./db";

const COOKIE = "session";
const SESSION_DAYS = 30;

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export async function startSession(userId: number) {
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)").run(
    sha256(token),
    userId,
    expires.toISOString(),
  );
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, // JavaScript in the page can't read it
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function endSession() {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (token) db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(token));
  store.delete(COOKIE);
}

// The logged-in user, or null. `cache` = only one database lookup per request.
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  const user = db
    .prepare(
      `SELECT u.id, u.username, u.role, u.display_name, u.wallet, u.avatar
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(sha256(token), new Date().toISOString()) as User | undefined;
  return user ?? null;
});

// For pages and actions that need a login (and optionally a certain role).
export async function requireUser(...roles: Role[]): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (roles.length > 0 && !roles.includes(user.role)) redirect("/");
  return user;
}
