"use client";

import { useActionState } from "react";
import { signup, type FormState } from "@/app/actions";
import { Field, FormMessage, inputClass } from "@/components/ui";

// Everyone signs up as a reader. Writing is possible after an approved author application.
export default function SignupForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signup, {});

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Name" hint="Shown at the top and used to greet you.">
        <input name="name" defaultValue={state.values?.name} maxLength={40} autoComplete="name" className={inputClass} />
      </Field>
      <Field label="Username" hint="3–20 characters: a–z, 0–9 and _">
        <input name="username" defaultValue={state.values?.username} autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Password" hint="At least 4 characters">
        <input name="password" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <FormMessage error={state.error} />
      <button disabled={pending} className="btn-blue w-full">
        {pending ? "Creating account…" : "Create account"}
      </button>
      <p className="type-micro text-center text-black/50">
        Want to write? After signing up, apply for an author account in Settings.
      </p>
    </form>
  );
}
