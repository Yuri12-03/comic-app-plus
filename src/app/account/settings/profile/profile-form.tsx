"use client";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import UserAvatar from "@/components/user-avatar";
import { avatarPresets, type AvatarPreset, type UserProfile } from "@/lib/profile";
import { saveProfile } from "./actions";

export default function ProfileForm({ profile, photoUrl, onboarding = false, next }: { profile: UserProfile | null; photoUrl: string | null; onboarding?: boolean; next?: string }) {
  const [name, setName] = useState(profile?.display_name ?? "");
  const [kind, setKind] = useState(profile?.avatar_kind ?? "preset");
  const [preset, setPreset] = useState<AvatarPreset>(profile?.avatar_preset ?? "cat");
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState("");
  const [preparing, setPreparing] = useState(false);
  const selection = useRef(0);
  const [state, action, pending] = useActionState(saveProfile.bind(null, onboarding), {});
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  async function choosePhoto(file?: File) {
    if (!file) return;
    const request = ++selection.current;
    setPhotoError(""); setPreparing(true);
    try {
      if (!/^(image\/jpeg|image\/png|image\/webp)$/.test(file.type)) throw new Error("JPEG・PNG・WebPの写真を選んでください。");
      if (file.size > 15 * 1024 * 1024) throw new Error("15MB以下の写真を選んでください。");
      const image = await createImageBitmap(file);
      try {
        const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
        const context = canvas.getContext("2d"); if (!context) throw new Error("写真を読み込めませんでした。");
        const side = Math.min(image.width, image.height);
        context.fillStyle = "#fff"; context.fillRect(0, 0, 256, 256);
        context.drawImage(image, (image.width-side)/2, (image.height-side)/2, side, side, 0, 0, 256, 256);
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", 0.88));
        if (!blob) throw new Error("写真を読み込めませんでした。");
        if (request === selection.current) { setPhoto(new File([blob], "profile.jpg", { type: "image/jpeg" })); setPreview(URL.createObjectURL(blob)); setKind("photo"); }
      } finally { image.close(); }
    } catch (error) { if (request === selection.current) setPhotoError(error instanceof Error ? error.message : "写真を読み込めませんでした。別の写真をお試しください。"); }
    finally { if (request === selection.current) setPreparing(false); }
  }
  return <form className="profile-card auth-form" onReset={event => event.preventDefault()} onSubmit={event => {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    if (kind === "photo" && photo) form.set("photo", photo);
    startTransition(() => action(form));
  }}>
    {next && <input type="hidden" name="next" value={next} />}
    <div className="profile-preview"><UserAvatar large name={name || "あなた"} preset={preset} photoUrl={kind === "photo" ? preview || photoUrl : null} /><strong>{name || "あなたのユーザーネーム"}</strong></div>
    <fieldset className="registration-fields" disabled={pending || preparing}>
      <label className="field">ユーザーネーム<input name="displayName" value={name} onChange={event => setName(event.target.value)} maxLength={60} required autoComplete="nickname" placeholder="例：まんが好きのねこ" /></label>
      <p className="help">1〜30文字。本棚で表示する名前です。</p>
      <input type="hidden" name="avatarKind" value={kind} /><input type="hidden" name="avatarPreset" value={preset} />
      <h2 className="profile-subheading">アイコン</h2><p className="help">デフォルトアイコン、または好きな写真を選べます。</p>
      <div className="avatar-options" role="radiogroup" aria-label="デフォルトアイコン">
        {avatarPresets.map(item => <label className={`avatar-option${kind === "preset" && preset === item.id ? " selected" : ""}`} key={item.id}>
          <input type="radio" name="presetChoice" value={item.id} checked={kind === "preset" && preset === item.id} onChange={() => { setKind("preset"); setPreset(item.id); }} /><UserAvatar preset={item.id} /><span>{item.label}</span>
        </label>)}
      </div>
      <div className={`profile-photo-choice${kind === "photo" ? " selected" : ""}`}>
        {(photo || photoUrl) && <label className="duplicate-confirm"><input type="radio" name="presetChoice" value="photo" checked={kind === "photo"} onChange={() => setKind("photo")} />選択した写真を使う</label>}
        <label className="field">写真を選択<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { void choosePhoto(event.target.files?.[0]); event.target.value = ""; }} /></label>
        <p className="help">JPEG・PNG・WebP、15MBまで。写真の中央を正方形に切り抜いて使用します。</p>
      </div>
    </fieldset>
    {preparing && <p role="status">写真を準備しています…</p>}
    {(photoError || state.error) && <p className="notice error" role="alert">{photoError || state.error}</p>}
    <button className="button" disabled={pending || preparing}>{pending ? "保存しています…" : onboarding ? "設定してホームへ" : "変更を保存"}</button>
  </form>;
}
