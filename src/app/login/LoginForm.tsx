"use client";

import { useActionState, useRef } from "react";
import { login, type FormState } from "@/app/actions";
import { Field, FormMessage, inputClass } from "@/components/ui";

const DEMO_ACCOUNTS = [
  { username: "demo", label: "Reader" },
  { username: "writer_demo", label: "Writer" },
  { username: "admin", label: "Admin" },
];

export default function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(login, {});
  const usernameRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function fillDemo(username: string) {
    if (usernameRef.current) usernameRef.current.value = username;
    if (passwordRef.current) passwordRef.current.value = "1234";
  }

  return (
    <>
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="next" value={next ?? ""} />
        <Field label="Username">
          <input ref={usernameRef} name="username" autoComplete="username" required className={inputClass} />
        </Field>
        <Field label="Password">
          <input
            ref={passwordRef}
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className={inputClass}
          />
        </Field>
        <FormMessage error={state.error} />
        <button disabled={pending} className="btn-blue w-full">
          {pending ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="mt-8 border-t border-black/10 pt-6">
        <p className="type-caption text-black/60">Demo accounts (password 1234):</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.username}
              type="button"
              onClick={() => fillDemo(account.username)}
              className="btn-pill"
            >
              {account.label} · {account.username}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
