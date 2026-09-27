// Small shared form pieces in the Apple style.

export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="type-caption font-semibold">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="type-micro mt-1 block text-black/50">{hint}</span>}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[11px] border border-black/10 bg-white px-3.5 py-2.5 text-[17px] outline-none focus:border-apple-blue focus:ring-2 focus:ring-apple-blue/30";

export function FormMessage({ error, success }: { error?: string; success?: string }) {
  if (error) return <p className="type-caption font-semibold text-apple-ink">⚠︎ {error}</p>;
  if (success) return <p className="type-caption text-black/60">✓ {success}</p>;
  return null;
}
