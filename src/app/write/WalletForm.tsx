"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { useActionState, useRef } from "react";
import { saveWallet, type FormState } from "@/app/actions";
import { FormMessage, inputClass } from "@/components/ui";

export default function WalletForm({ current }: { current: string | null }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(saveWallet, {});
  const { publicKey } = useWallet();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          ref={inputRef}
          name="wallet"
          defaultValue={current ?? ""}
          placeholder="Your Solana wallet address"
          required
          className={`${inputClass} font-mono text-[14px]`}
        />
        <button disabled={pending} className="btn-blue shrink-0">
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
      {publicKey && (
        <button
          type="button"
          onClick={() => inputRef.current && (inputRef.current.value = publicKey.toBase58())}
          className="type-caption text-apple-link hover:underline"
        >
          Use my connected wallet
        </button>
      )}
      <FormMessage error={state.error} success={state.success} />
    </form>
  );
}
