// Profile pictures (server only).
//  - Icons: any image placed in public/avatar-icons/ can be picked in Settings.
//  - Uploads: saved in media/avatars/ and served by /api/avatar/<file>.
// A user's avatar is stored as "icon:<file>" or "upload:<file>" (null = initial letter).

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const ICON_DIR = resolve("public", "avatar-icons");
export const UPLOAD_DIR = resolve("media", "avatars");
export const MAX_AVATAR_MB = 2;

export const IMAGE_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
};

// File names are checked strictly, so nobody can reach other folders.
export const isSafeName = (name: string) => /^[\w-]+\.(png|jpe?g|webp|gif|svg)$/i.test(name);

export function listAvatarIcons(): string[] {
  if (!existsSync(ICON_DIR)) return [];
  return readdirSync(ICON_DIR).filter(isSafeName).sort();
}

export function iconExists(name: string) {
  return isSafeName(name) && existsSync(join(ICON_DIR, name));
}

// Uploaded photos: PNG, JPG, WebP or GIF (no SVG, it can contain scripts).
export async function saveAvatarUpload(file: File): Promise<string> {
  const ext = extname(file.name).toLowerCase();
  if (!IMAGE_TYPES[ext] || ext === ".svg") throw new Error("Please choose a PNG, JPG, WebP or GIF image.");
  if (file.size > MAX_AVATAR_MB * 1024 * 1024) throw new Error(`The image is larger than ${MAX_AVATAR_MB} MB.`);
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const name = `${randomUUID()}${ext}`;
  writeFileSync(join(UPLOAD_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export function deleteAvatarUpload(avatar: string | null) {
  if (!avatar?.startsWith("upload:")) return;
  const name = avatar.slice("upload:".length);
  if (isSafeName(name) && existsSync(join(UPLOAD_DIR, name))) unlinkSync(join(UPLOAD_DIR, name));
}
