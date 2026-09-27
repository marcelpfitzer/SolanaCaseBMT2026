// A pretend wallet for demos and testing, so nobody needs Phantom installed.
// It creates a real Solana keypair and keeps it in the browser's localStorage,
// so it survives page refreshes. Transactions really happen on Devnet.
//
// ⚠️ DEVNET ONLY: anyone with access to this browser can read the secret key.
// Never use this with real money (mainnet).

import {
  BaseMessageSignerWalletAdapter,
  WalletName,
  WalletNotConnectedError,
  WalletReadyState,
  isVersionedTransaction,
  type TransactionOrVersionedTransaction,
} from "@solana/wallet-adapter-base";
import { Keypair, PublicKey } from "@solana/web3.js";

const STORAGE_KEY = "payperread-demo-wallet";

export const DemoWalletName = "Demo Wallet" as WalletName<"Demo Wallet">;

function loadOrCreateKeypair(): Keypair {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(saved)));
  } catch {
    // storage blocked or broken data: fall through and make a new wallet
  }
  const keypair = Keypair.generate();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(keypair.secretKey)));
  } catch {
    // storage blocked: wallet still works, but is lost on refresh
  }
  return keypair;
}

export class DemoWalletAdapter extends BaseMessageSignerWalletAdapter {
  name = DemoWalletName;
  url = "https://github.com/marcelpfitzer/SolanaCaseBMT2026";
  icon =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="#f59e0b"/><text x="16" y="22" font-size="16" text-anchor="middle" font-family="Arial" font-weight="bold" fill="#fff">D</text></svg>',
    );
  readyState =
    typeof window === "undefined" ? WalletReadyState.Unsupported : WalletReadyState.Loadable;
  supportedTransactionVersions = new Set(["legacy", 0] as const);

  private keypair: Keypair | null = null;

  get publicKey(): PublicKey | null {
    return this.keypair?.publicKey ?? null;
  }

  get connecting() {
    return false;
  }

  async connect() {
    this.keypair = loadOrCreateKeypair();
    this.emit("connect", this.keypair.publicKey);
  }

  async disconnect() {
    // The key stays saved, so reconnecting gives you the same wallet (and balance).
    this.keypair = null;
    this.emit("disconnect");
  }

  async signTransaction<T extends TransactionOrVersionedTransaction<this["supportedTransactionVersions"]>>(
    transaction: T,
  ): Promise<T> {
    if (!this.keypair) throw new WalletNotConnectedError();
    if (isVersionedTransaction(transaction)) {
      transaction.sign([this.keypair]);
    } else {
      transaction.partialSign(this.keypair);
    }
    return transaction;
  }

  // Signs a text message (used to prove wallet ownership, e.g. "Restore purchases").
  // Uses the browser's built-in Web Crypto Ed25519, the same algorithm Solana uses.
  async signMessage(message: Uint8Array): Promise<Uint8Array> {
    if (!this.keypair) throw new WalletNotConnectedError();
    const pkcs8Header = [0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20];
    const pkcs8 = new Uint8Array([...pkcs8Header, ...this.keypair.secretKey.slice(0, 32)]);
    const key = await crypto.subtle.importKey("pkcs8", pkcs8, { name: "Ed25519" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("Ed25519", key, new Uint8Array(message)));
  }
}
