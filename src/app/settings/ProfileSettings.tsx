"use client";

// Settings → Profile: your name and a profile picture (photo or icon).

import Image from "next/image";
import { useActionState, useState } from "react";
import { saveAvatar, saveProfile, type FormState } from "@/app/actions";
import Avatar from "@/components/Avatar";
import { Field, FormMessage, inputClass } from "@/components/ui";

type Props = {
  name: string;
  avatar: string | null;
  icons: string[];
};

export default function ProfileSettings({ name, avatar, icons }: Props) {
  const [profileState, profileAction, profilePending] = useActionState<FormState, FormData>(saveProfile, {});
  const [avatarState, avatarAction, avatarPending] = useActionState<FormState, FormData>(saveAvatar, {});
  const [preview, setPreview] = useState<string | null>(null); // chosen photo, before saving
  const [icon, setIcon] = useState<string | null>(avatar?.startsWith("icon:") ? avatar.slice(5) : null);

  return (
    <div className="space-y-8">
      {/* Name */}
      <form action={profileAction} className="space-y-4">
        <Field label="Name" hint="Shown at the top, used to greet you, and as author name if you write.">
          <input name="name" defaultValue={profileState.values?.name ?? name} required minLength={2} maxLength={40} className={inputClass} />
        </Field>
        <div className="flex flex-wrap items-center gap-4">
          <button disabled={profilePending} className="btn-blue">
            {profilePending ? "Saving…" : "Save"}
          </button>
          <FormMessage error={profileState.error} success={profileState.success} />
        </div>
      </form>

      {/* Picture */}
      <div className="border-t border-black/10 pt-6">
        <p className="type-caption font-semibold">Profile picture</p>
        <div className="mt-4 flex flex-wrap items-center gap-5">
          {preview ? (
            <Image src={preview} alt="" width={72} height={72} unoptimized className="h-[72px] w-[72px] rounded-full object-cover" />
          ) : (
            <Avatar avatar={icon ? `icon:${icon}` : avatar} name={name} size={72} />
          )}

          {/* Upload a photo */}
          <form action={avatarAction} className="flex flex-wrap items-center gap-3">
            <input type="hidden" name="mode" value="upload" />
            <label className="btn-pill cursor-pointer">
              Choose photo…
              <input
                type="file"
                name="photo"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  setPreview(file ? URL.createObjectURL(file) : null);
                  setIcon(null);
                }}
              />
            </label>
            {preview && (
              <button disabled={avatarPending} className="btn-blue">
                {avatarPending ? "Uploading…" : "Use this photo"}
              </button>
            )}
          </form>

          {avatar && !preview && (
            <form action={avatarAction}>
              <input type="hidden" name="mode" value="remove" />
              <button disabled={avatarPending} className="type-caption text-apple-link hover:underline">
                Remove picture
              </button>
            </form>
          )}
        </div>

        {/* Or pick an icon */}
        <form action={avatarAction} className="mt-6">
          <input type="hidden" name="mode" value="icon" />
          <p className="type-caption text-black/60">…or pick an icon:</p>
          {icons.length === 0 ? (
            <p className="type-caption mt-2 text-black/40">No icons available yet.</p>
          ) : (
            <>
              <div className="mt-3 flex flex-wrap gap-3">
                {icons.map((name) => (
                  <label key={name} className="cursor-pointer" title={name}>
                    <input
                      type="radio"
                      name="icon"
                      value={name}
                      checked={icon === name && !preview}
                      onChange={() => {
                        setIcon(name);
                        setPreview(null);
                      }}
                      className="peer sr-only"
                    />
                    <Image
                      src={`/avatar-icons/${name}`}
                      alt={name}
                      width={56}
                      height={56}
                      unoptimized
                      className="h-14 w-14 rounded-full bg-apple-gray object-cover ring-offset-2 transition peer-checked:ring-2 peer-checked:ring-apple-blue peer-focus-visible:ring-2 peer-focus-visible:ring-apple-blue hover:opacity-80"
                    />
                  </label>
                ))}
              </div>
              {icon && avatar !== `icon:${icon}` && !preview && (
                <button disabled={avatarPending} className="btn-blue mt-4">
                  {avatarPending ? "Saving…" : "Use this icon"}
                </button>
              )}
            </>
          )}
        </form>
        <div className="mt-3">
          <FormMessage error={avatarState.error} success={avatarState.success} />
        </div>
      </div>
    </div>
  );
}
