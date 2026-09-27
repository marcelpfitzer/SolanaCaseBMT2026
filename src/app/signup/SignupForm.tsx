"use client";

import { useActionState } from "react";
import { signup, type FormState } from "@/app/actions";
import { Field, FormMessage, inputClass } from "@/components/ui";

export default function SignupForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(signup, {});

  return (
    <form action={formAction} className="space-y-5">
      <fieldset>
        <legend className="type-caption font-semibold">I want to</legend>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {[
            { value: "reader", label: "Read articles" },
            { value: "writer", label: "Write articles" },
          ].map((option) => (
            <label
              key={option.value}
              className="cursor-pointer rounded-[11px] border border-black/10 px-3 py-2.5 text-center has-[:checked]:border-apple-blue has-[:checked]:ring-2 has-[:checked]:ring-apple-blue/30"
            >
              <input
                type="radio"
                name="role"
                value={option.value}
                defaultChecked={option.value === "reader"}
                className="sr-only"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Username" hint="3–20 characters: a–z, 0–9 and _">
        <input name="username" autoComplete="username" required className={inputClass} />
      </Field>
      <Field label="Display name" hint="Shown as the author name on your articles">
        <input name="displayName" maxLength={40} className={inputClass} />
      </Field>
      <Field label="Password" hint="At least 4 characters">
        <input name="password" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      <FormMessage error={state.error} />
      <button disabled={pending} className="btn-blue w-full">
        {pending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
