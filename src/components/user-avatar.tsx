/* eslint-disable @next/next/no-img-element */
import { avatarPresets, type AvatarPreset } from "@/lib/profile";

export default function UserAvatar({ preset = "cat", photoUrl, name = "ユーザー", large = false }: { preset?: AvatarPreset; photoUrl?: string | null; name?: string; large?: boolean }) {
  const item = avatarPresets.find(item => item.id === preset) ?? avatarPresets[0];
  return <span className={`user-avatar${large ? " large" : ""}`} style={{ background: item.color }}>
    {photoUrl ? <img src={photoUrl} alt={`${name}のアイコン`} referrerPolicy="no-referrer" /> : <svg viewBox="0 0 64 64" role="img" aria-label={`${item.label}のアイコン`} fill="none" stroke="#51473e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {preset === "book" ? <><path d="M32 19c-9-5-17-5-23-2v30c8-3 15-3 23 2 8-5 15-5 23-2V17c-6-3-14-3-23 2Z" fill="#fff9e8" /><path d="M32 19v30M15 25h10m-10 7h10m14-7h10m-10 7h10" /></> : preset === "coffee" ? <><path d="M16 26h30v14a15 15 0 0 1-30 0Z" fill="#fff9e8" /><path d="M46 28h3a7 7 0 0 1 0 14h-3M12 54h39M25 18c-6-5 5-7 0-12m11 12c-6-5 5-7 0-12" /></> : <>
        {preset === "cat" && <path d="M13 27 12 12l15 9m24 6 1-15-15 9" fill="#fff5e9" />}
        {preset === "dog" && <><path d="M20 21C4 16 6 46 17 39m27-18c16-5 14 25 3 18" fill="#b48c65" /></>}
        {preset === "rabbit" && <><ellipse cx="23" cy="18" rx="6" ry="14" fill="#fff7f4" /><ellipse cx="41" cy="18" rx="6" ry="14" fill="#fff7f4" /></>}
        {preset === "bear" && <><circle cx="17" cy="21" r="8" fill="#b99572" /><circle cx="47" cy="21" r="8" fill="#b99572" /></>}
        {preset === "fox" && <path d="m13 30-1-18 17 11m22 7 1-18-17 11" fill="#d99951" />}
        <ellipse cx="32" cy="36" rx="21" ry="19" fill={preset === "penguin" ? "#657b89" : preset === "bear" ? "#b99572" : preset === "fox" ? "#d99951" : "#fff5e9"} />
        {preset === "penguin" && <ellipse cx="32" cy="40" rx="15" ry="13" fill="#fff9ee" />}
        {preset === "fox" && <path d="m13 35 19 16 19-16c-5 0-11 3-19 7-8-4-14-7-19-7Z" fill="#fff9ee" stroke="none" />}
        <circle cx="24" cy="33" r="1.7" fill="#51473e" stroke="none" /><circle cx="40" cy="33" r="1.7" fill="#51473e" stroke="none" />
        {preset === "penguin" ? <path d="m28 38 4 5 4-5Z" fill="#dfa44a" /> : <><path d="m29 39 3 3 3-3Z" fill="#51473e" /><path d="M32 42v3m-5 0c2 3 8 3 10 0" /></>}
        {preset === "cat" && <path d="m8 37 10 2M8 44l10-2m28-3 10-2m-10 5 10 2" />}
      </>}
    </svg>}
  </span>;
}
