"use client";

import { useActionState, useState } from "react";
import { publishArticle, type FormState } from "@/app/actions";
import { Field, FormMessage, inputClass } from "@/components/ui";
import { PRICE_CENTS, formatEur } from "@/lib/config";

const MAX_MB = 25;

export default function NewArticleForm({ disabled }: { disabled: boolean }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(publishArticle, {});
  const [kind, setKind] = useState<"article" | "podcast">("article");
  const [duration, setDuration] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);

  // Measure the audio length in the browser before uploading.
  function onAudioChosen(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setDuration("");
    setFileError(null);
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      setFileError(`This file is larger than ${MAX_MB} MB.`);
      event.target.value = "";
      return;
    }
    const url = URL.createObjectURL(file);
    const audio = new Audio(url);
    audio.onloadedmetadata = () => {
      setDuration(String(Math.round(audio.duration)));
      URL.revokeObjectURL(url);
    };
  }

  const isPodcast = kind === "podcast";

  return (
    <form action={formAction} className="space-y-5">
      <fieldset>
        <legend className="type-caption font-semibold">Type</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:max-w-md">
          {(["article", "podcast"] as const).map((option) => (
            <label
              key={option}
              className="cursor-pointer rounded-[11px] border border-black/10 px-3 py-2.5 text-center has-[:checked]:border-apple-blue has-[:checked]:ring-2 has-[:checked]:ring-apple-blue/30"
            >
              <input
                type="radio"
                name="kind"
                value={option}
                checked={kind === option}
                onChange={() => setKind(option)}
                className="sr-only"
              />
              {option === "article" ? "Article" : "Podcast"} · {formatEur(PRICE_CENTS[option])}
            </label>
          ))}
        </div>
      </fieldset>

      <Field label="Title">
        <input name="title" defaultValue={state.values?.title} required minLength={5} maxLength={120} className={inputClass} />
      </Field>
      <Field label="Teaser" hint="Free for everyone to read. Make them want more (20–300 characters).">
        <textarea name="teaser" defaultValue={state.values?.teaser} required minLength={20} maxLength={300} rows={2} className={inputClass} />
      </Field>

      {isPodcast && (
        <Field label="Audio file" hint={`MP3, M4A, AAC, WAV or OGG, up to ${MAX_MB} MB. Locked until a listener pays.`}>
          <input
            name="audio"
            type="file"
            accept=".mp3,.m4a,.aac,.wav,.ogg,audio/*"
            required
            onChange={onAudioChosen}
            className="type-caption block w-full file:mr-3 file:rounded-full file:border-0 file:bg-apple-gray file:px-4 file:py-2 file:text-[14px] hover:file:bg-[#ededf2]"
          />
          <input type="hidden" name="duration" value={duration} />
          {fileError && <span className="type-caption mt-1 block font-semibold">⚠︎ {fileError}</span>}
        </Field>
      )}

      <Field
        label={isPodcast ? "Show notes / transcript" : "Article"}
        hint={
          isPodcast
            ? "Shown under the player after purchase (at least 20 characters)."
            : "Locked until a reader pays. Separate paragraphs with an empty line."
        }
      >
        <textarea
          key={kind}
          name="body"
          defaultValue={state.values?.body}
          required
          minLength={isPodcast ? 20 : 100}
          rows={isPodcast ? 6 : 12}
          className={inputClass}
        />
      </Field>

      <FormMessage error={state.error} />
      <button disabled={pending || disabled} className="btn-blue">
        {pending ? (isPodcast ? "Uploading…" : "Publishing…") : isPodcast ? "Publish podcast" : "Publish article"}
      </button>
    </form>
  );
}
