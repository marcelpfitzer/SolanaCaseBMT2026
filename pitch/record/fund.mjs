// Run from the repo root: node pitch/record/fund.mjs in|out  — moves Devnet SOL between the publisher wallet and the video wallet.
import { Connection, Keypair, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { readFileSync } from "node:fs";
const raw = readFileSync(".env.local", "utf8").match(/PUBLISHER_SECRET_KEY=(.*)/)[1].trim();
const publisher = Keypair.fromSecretKey(Uint8Array.from(raw.startsWith("[") ? JSON.parse(raw) : (await import("bs58")).default.decode(raw)));
const video = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(new URL("./video-wallet.json", import.meta.url), "utf8"))));
const c = new Connection("https://api.devnet.solana.com", "confirmed");
const [from, to] = process.argv[2] === "in" ? [publisher, video] : [video, publisher];
const lamports = process.argv[2] === "in" ? 1_700_000 : (await c.getBalance(video.publicKey)) - 5000;
if (lamports > 0) {
  const sig = await sendAndConfirmTransaction(c, new Transaction().add(SystemProgram.transfer({ fromPubkey: from.publicKey, toPubkey: to.publicKey, lamports })), [from]);
  console.log("sent", lamports / 1e9, "SOL", sig);
}
console.log("publisher", (await c.getBalance(publisher.publicKey)) / 1e9, "video", (await c.getBalance(video.publicKey)) / 1e9);
