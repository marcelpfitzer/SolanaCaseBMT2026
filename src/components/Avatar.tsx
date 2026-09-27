import Image from "next/image";

// "icon:cat.png" → /avatar-icons/cat.png, "upload:abc.jpg" → /api/avatar/abc.jpg
export function avatarUrl(avatar: string | null | undefined): string | null {
  if (avatar?.startsWith("icon:")) return `/avatar-icons/${avatar.slice(5)}`;
  if (avatar?.startsWith("upload:")) return `/api/avatar/${avatar.slice(7)}`;
  return null;
}

// Round profile picture. Without a picture: the first letter on Apple blue.
export default function Avatar({ avatar, name, size }: { avatar: string | null; name: string; size: number }) {
  const url = avatarUrl(avatar);
  if (url) {
    return (
      <Image
        src={url}
        alt=""
        width={size}
        height={size}
        unoptimized
        className="shrink-0 rounded-full bg-apple-gray object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="flex shrink-0 items-center justify-center rounded-full bg-apple-blue font-semibold text-white"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.45) }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
