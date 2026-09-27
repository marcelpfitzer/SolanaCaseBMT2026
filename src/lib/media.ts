// Podcast audio files (server only). They live in media/, NOT in public/,
// so nobody can download them without paying (see app/api/media/[id]/route.ts).
//
// Replacing a demo episode with your own recording: put a file with the same
// name into media/podcasts/, e.g. media/podcasts/five-cent-question.mp3.
// .mp3 is preferred over .m4a, so your file wins over the generated one.

import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const MEDIA_DIR = resolve("media");

export const AUDIO_TYPES: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4",
  ".aac": "audio/aac",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
};
export const MAX_UPLOAD_MB = 25;

// "podcasts/five-cent-question" → the first existing file with a known extension.
export function resolveAudio(audioPath: string): { file: string; type: string } | null {
  const base = resolve(MEDIA_DIR, audioPath);
  if (!base.startsWith(MEDIA_DIR + "/")) return null; // never leave the media folder

  const ext = extname(base).toLowerCase();
  if (AUDIO_TYPES[ext] && existsSync(base)) return { file: base, type: AUDIO_TYPES[ext] };
  for (const [candidate, type] of Object.entries(AUDIO_TYPES)) {
    if (existsSync(base + candidate)) return { file: base + candidate, type };
  }
  return null;
}

// Saves an uploaded audio file and returns its path inside media/.
export async function saveAudioUpload(file: File): Promise<string> {
  const ext = extname(file.name).toLowerCase();
  if (!AUDIO_TYPES[ext]) throw new Error("Please upload an MP3, M4A, AAC, WAV or OGG file.");
  if (file.size > MAX_UPLOAD_MB * 1024 * 1024) throw new Error(`The audio file is larger than ${MAX_UPLOAD_MB} MB.`);

  mkdirSync(join(MEDIA_DIR, "uploads"), { recursive: true });
  const relative = `uploads/${randomUUID()}${ext}`;
  writeFileSync(join(MEDIA_DIR, relative), Buffer.from(await file.arrayBuffer()));
  return relative;
}

export function deleteAudioUpload(audioPath: string | null) {
  if (!audioPath?.startsWith("uploads/")) return; // never delete the demo episodes
  const found = resolveAudio(audioPath);
  if (found) unlinkSync(found.file);
}
