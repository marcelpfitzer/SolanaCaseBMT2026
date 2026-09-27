"use server";

// Server Actions: functions the forms call. They run on the server only,
// and every one of them checks who is logged in before doing anything.

import { PublicKey } from "@solana/web3.js";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, requireUser, startSession } from "@/lib/auth";
import { PRICE_CENTS } from "@/lib/config";
import type { Role } from "@/lib/db";
import { deleteAudioUpload, saveAudioUpload } from "@/lib/media";
import { deleteAvatarUpload, iconExists, saveAvatarUpload } from "@/lib/avatars";
import { checkPassword, hashPassword } from "@/lib/password";
import * as q from "@/lib/queries";

// values = what the user typed, sent back on errors so the form doesn't lose it
// (React clears forms after every submit). Never includes passwords or files.
export type FormState = { error?: string; success?: string; values?: Record<string, string> };

function keepValues(formData: FormData, result: FormState): FormState {
  if (!result.error) return result;
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !key.startsWith("$") && key !== "password") values[key] = value;
  });
  return { ...result, values };
}

const text = (formData: FormData, name: string) => String(formData.get(name) ?? "").trim();

// ---------- Login / sign-up / logout ----------

export async function login(prev: FormState, formData: FormData): Promise<FormState> {
  return keepValues(formData, await loginChecked(prev, formData));
}

async function loginChecked(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = q.findUserByUsername(text(formData, "username").toLowerCase());
  if (!user || !checkPassword(text(formData, "password"), user.password_hash)) {
    return { error: "Wrong username or password." };
  }
  await startSession(user.id);

  // Go back to where the user came from (only paths on our own site), else to their home.
  const next = text(formData, "next");
  if (next.startsWith("/") && !next.startsWith("//")) redirect(next);
  redirect(user.role === "admin" ? "/admin" : user.role === "writer" ? "/write" : "/");
}

export async function signup(prev: FormState, formData: FormData): Promise<FormState> {
  return keepValues(formData, await signupChecked(prev, formData));
}

async function signupChecked(_prev: FormState, formData: FormData): Promise<FormState> {
  const username = text(formData, "username").toLowerCase();
  const password = text(formData, "password");
  const name = text(formData, "name") || username;

  if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    return { error: "Username: 3–20 characters, only a–z, 0–9 and _." };
  }
  if (password.length < 4) return { error: "Password must be at least 4 characters." };
  if (q.findUserByUsername(username)) return { error: "This username is taken." };

  // Everyone starts as a reader. Writing needs an approved author application.
  const id = q.createUser(username, hashPassword(password), "reader", name.slice(0, 40));
  await startSession(id);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/");
}

// ---------- Profile ----------

export async function saveProfile(prev: FormState, formData: FormData): Promise<FormState> {
  return keepValues(formData, await saveProfileChecked(prev, formData));
}

async function saveProfileChecked(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const name = text(formData, "name");
  if (name.length < 2 || name.length > 40) return { error: "Name: 2–40 characters." };
  q.updateName(user.id, name);
  revalidatePath("/", "layout");
  return { success: "Saved." };
}

// ---------- Becoming an author ----------

export async function applyForAuthor(prev: FormState, formData: FormData): Promise<FormState> {
  return keepValues(formData, await applyForAuthorChecked(prev, formData));
}

async function applyForAuthorChecked(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("reader");
  if (q.latestApplication(user.id)?.status === "pending") {
    return { error: "You already have an application in review." };
  }
  const motivation = text(formData, "motivation");
  const topics = text(formData, "topics");
  const sampleUrl = text(formData, "sampleUrl");
  const sampleText = text(formData, "sampleText");

  if (motivation.length < 80) return { error: "Tell us a bit more about why you want to write (at least 80 characters)." };
  if (topics.length < 3) return { error: "Which topics do you want to write about?" };
  if (sampleText.length < 400) return { error: "Your writing sample needs at least 400 characters." };
  if (sampleUrl && !/^https?:\/\/\S+\.\S+/.test(sampleUrl)) return { error: "The link must start with http:// or https://" };

  q.createApplication({
    userId: user.id,
    motivation: motivation.slice(0, 2000),
    topics: topics.slice(0, 200),
    sampleUrl: sampleUrl || null,
    sampleText: sampleText.slice(0, 10000),
  });
  revalidatePath("/settings");
  revalidatePath("/admin");
  return { success: "Application sent. An editor will review it." };
}

// mode = "upload" (with a file), "icon" (with an icon name) or "remove".
export async function saveAvatar(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const mode = text(formData, "mode");
  let avatar: string | null = null;

  if (mode === "upload") {
    const file = formData.get("photo");
    if (!(file instanceof File) || file.size === 0) return { error: "Please choose a picture." };
    try {
      avatar = `upload:${await saveAvatarUpload(file)}`;
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed." };
    }
  } else if (mode === "icon") {
    const icon = text(formData, "icon");
    if (!iconExists(icon)) return { error: "Please pick an icon." };
    avatar = `icon:${icon}`;
  }

  deleteAvatarUpload(user.avatar); // the old uploaded photo isn't needed anymore
  q.setUserAvatar(user.id, avatar);
  revalidatePath("/", "layout");
  return { success: avatar ? "Profile picture saved." : "Profile picture removed." };
}

// ---------- Writers ----------

export async function saveWallet(prev: FormState, formData: FormData): Promise<FormState> {
  return keepValues(formData, await saveWalletChecked(prev, formData));
}

async function saveWalletChecked(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("writer", "admin");
  const wallet = text(formData, "wallet");
  try {
    new PublicKey(wallet); // throws if this is not a valid Solana address
  } catch {
    return { error: "That is not a valid Solana wallet address." };
  }
  q.setUserWallet(user.id, wallet);
  revalidatePath("/write");
  return { success: "Payout wallet saved." };
}

export async function publishArticle(prev: FormState, formData: FormData): Promise<FormState> {
  return keepValues(formData, await publishArticleChecked(prev, formData));
}

async function publishArticleChecked(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("writer", "admin");
  if (!user.wallet) return { error: "Set your payout wallet first, so readers can pay you." };

  const kind = text(formData, "kind") === "podcast" ? "podcast" : "article";
  const title = text(formData, "title");
  const teaser = text(formData, "teaser");
  const body = text(formData, "body");
  if (title.length < 5 || title.length > 120) return { error: "Title: 5–120 characters." };
  if (teaser.length < 20 || teaser.length > 300) return { error: "Teaser: 20–300 characters." };

  let audioPath: string | null = null;
  let durationSeconds: number | null = null;
  if (kind === "podcast") {
    if (body.length < 20) return { error: "Show notes need at least 20 characters." };
    const audio = formData.get("audio");
    if (!(audio instanceof File) || audio.size === 0) return { error: "Please choose an audio file." };
    try {
      audioPath = await saveAudioUpload(audio);
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Upload failed." };
    }
    // The browser measured the length before uploading (see NewArticleForm).
    durationSeconds = Math.round(Number(formData.get("duration"))) || null;
  } else if (body.length < 100) {
    return { error: "The article needs at least 100 characters." };
  }

  const id = q.createArticle({
    writerId: user.id,
    kind,
    title,
    teaser,
    body,
    priceCents: PRICE_CENTS[kind],
    audioPath,
    durationSeconds,
  });
  revalidatePath("/");
  redirect(`/articles/${id}`);
}

// Writers can hide/show and delete their own articles; admins can do it for all.
async function requireArticleOwnerOrAdmin(articleId: number) {
  const user = await requireUser("writer", "admin");
  const article = q.getArticle(articleId);
  if (!article) throw new Error("Article not found.");
  if (user.role !== "admin" && article.writer_id !== user.id) throw new Error("Not your article.");
  return article;
}

export async function togglePublished(formData: FormData) {
  const article = await requireArticleOwnerOrAdmin(Number(formData.get("articleId")));
  q.setPublished(article.id, !article.published);
  revalidatePath("/", "layout");
}

export async function removeArticle(formData: FormData) {
  const article = await requireArticleOwnerOrAdmin(Number(formData.get("articleId")));
  if (q.salesCount(article.id) > 0) {
    // Someone bought it: it's theirs forever. Hide it from the shop, keep it for buyers.
    q.setPublished(article.id, false);
  } else {
    q.deleteArticle(article.id);
    deleteAudioUpload(article.audio_path); // uploaded podcast audio goes too
  }
  revalidatePath("/", "layout");
}

// ---------- Admin ----------

export async function reviewAuthorApplication(formData: FormData) {
  await requireUser("admin");
  const application = q.getApplication(Number(formData.get("applicationId")));
  if (!application || application.status !== "pending") return;
  const decision = String(formData.get("decision")) === "approve" ? "approved" : "rejected";
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;

  q.reviewApplication(application.id, decision, note);
  if (decision === "approved") q.setUserRole(application.user_id, "writer");
  revalidatePath("/", "layout");
}

export async function changeRole(formData: FormData) {
  const admin = await requireUser("admin");
  const userId = Number(formData.get("userId"));
  const role = String(formData.get("role")) as Role;
  if (userId === admin.id) return; // don't lock yourself out
  if (!["admin", "writer", "reader"].includes(role)) return;
  q.setUserRole(userId, role);
  revalidatePath("/admin");
}
