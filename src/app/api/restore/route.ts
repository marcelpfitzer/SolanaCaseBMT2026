// POST /api/restore  { wallet, time, signature }
// Needs a login + a wallet signature. Re-adds all purchases found on the blockchain.

import { getCurrentUser } from "@/lib/auth";
import { isValidWalletSignature, restoreMessage, restorePurchases } from "@/lib/restore";

const MAX_AGE_MS = 10 * 60 * 1000; // a signature is only valid for 10 minutes

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please log in first." }, { status: 401 });

  const { wallet, time, signature } = await request.json().catch(() => ({}));
  if (typeof wallet !== "string" || typeof time !== "string" || typeof signature !== "string") {
    return Response.json({ error: "wallet, time and signature are required." }, { status: 400 });
  }

  const age = Date.now() - new Date(time).getTime();
  if (!(age >= -60_000 && age < MAX_AGE_MS)) {
    return Response.json({ error: "The signature has expired. Please try again." }, { status: 400 });
  }

  // The server rebuilds the message itself, so it must be exactly this account + wallet.
  if (!isValidWalletSignature(wallet, restoreMessage(user.username, wallet, time), signature)) {
    return Response.json({ error: "The wallet signature is not valid." }, { status: 401 });
  }

  try {
    return Response.json(await restorePurchases(user, wallet));
  } catch {
    return Response.json({ error: "Could not read the wallet history from Devnet. Please try again." }, { status: 502 });
  }
}
