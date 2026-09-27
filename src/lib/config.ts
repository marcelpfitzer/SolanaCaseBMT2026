// Settings shared by the browser and the server.

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// Prices in euro cents.
export const PRICE_CENTS = { article: 5, podcast: 20 } as const;

// Fixed demo exchange rate, so the price in SOL never changes during the demo.
export const EUR_PER_SOL = 150;

// Euro cents → lamports. Example: 5 cents = €0.05 / €150 per SOL = 0.000333 SOL.
// 1 SOL = 1,000,000,000 lamports (the smallest unit).
export const priceLamports = (cents: number) => Math.round((cents / 100 / EUR_PER_SOL) * LAMPORTS_PER_SOL);

export const lamportsToSol = (lamports: number) => lamports / LAMPORTS_PER_SOL;

// 5 → "€0.05"
export const formatEur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
