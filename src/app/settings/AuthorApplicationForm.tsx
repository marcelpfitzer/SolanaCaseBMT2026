"use client";

// Settings → "Become an author": the application form for readers.

import { useActionState } from "react";
import { applyForAuthor, type FormState } from "@/app/actions";
import { Field, FormMessage, inputClass } from "@/components/ui";

export default function AuthorApplicationForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(applyForAuthor, {});

  if (state.success) return <p className="type-caption font-semibold">✓ {state.success}</p>;

  return (
    <form action={formAction} className="space-y-5">
      <Field label="Why do you want to write on payperread?" hint="At least 80 characters.">
        <textarea name="motivation" defaultValue={state.values?.motivation} required minLength={80} maxLength={2000} rows={3} className={inputClass} />
      </Field>
      <Field label="Your topics" hint="e.g. local politics, climate, crypto security">
        <input name="topics" defaultValue={state.values?.topics} required minLength={3} maxLength={200} className={inputClass} />
      </Field>
      <Field label="Link to your previous writing (optional)" hint="Blog, portfolio, published articles…">
        <input name="sampleUrl" defaultValue={state.values?.sampleUrl} type="url" placeholder="https://" maxLength={300} className={inputClass} />
      </Field>
      <Field
        label="Writing sample"
        hint="An original piece, or the start of one (at least 400 characters). This is what the editors judge."
      >
        <textarea name="sampleText" defaultValue={state.values?.sampleText} required minLength={400} maxLength={10000} rows={8} className={inputClass} />
      </Field>
      <FormMessage error={state.error} />
      <button disabled={pending} className="btn-blue">
        {pending ? "Sending…" : "Send application"}
      </button>
    </form>
  );
}
