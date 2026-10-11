"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { saveCoverPhoto } from "@/app/account/bookshelf/cover-actions";

async function preparePhoto(file: File) {
  if (!file.type.startsWith("image/") || file.size > 20 * 1024 * 1024) throw new Error("20MB以内の写真を選んでください。");
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, 1000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("写真を読み込めませんでした。");
    context.fillStyle = "white"; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("写真を変換できませんでした。")), "image/jpeg", .78));
    if (blob.size > 512 * 1024) throw new Error("写真が大きすぎます。少し離れて撮り直してください。");
    return new File([blob], "cover.jpg", { type: "image/jpeg" });
  } finally { bitmap.close(); }
}

type Props = { title: string; volume: number | null; url: string | null; copyId?: string; href?: string; onPhoto?: (file: File) => void; disabled?: boolean };
export default function ComicCover({ title, volume, url, copyId, href, onPhoto, disabled = false }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const [savedUrl, setSavedUrl] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [choosing, setChoosing] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => { if (choosing) dialog.current?.showModal(); else dialog.current?.close(); }, [choosing]);
  const displayed = savedUrl || url;
  const allowed = displayed?.startsWith("https://") || displayed?.startsWith("/sample-covers/") || (displayed === preview && Boolean(photo));
  const present = Boolean(displayed && allowed && failedUrl !== displayed);
  const editable = Boolean(copyId || onPhoto);
  const volumeText = volume === null ? "" : `${volume}巻`;
  const placeholder = <><span aria-hidden="true">▥</span><strong>{title}</strong><span>{volumeText}</span><small>No Image</small>{editable && <small>📷 タップして表紙を撮影</small>}</>;
  const cover = <div className="comic-cover">{present ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={displayed!} alt={`${title} ${volumeText}の表紙`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(displayed)} />
  ) : editable ? <button type="button" className="cover-placeholder cover-camera" aria-label={`${title} ${volumeText}の表紙を撮影`} disabled={disabled || busy} onClick={() => { setMessage(""); input.current?.click(); }}>{placeholder}</button> : <div className="cover-placeholder" role="img" aria-label={`${title} ${volumeText}・表紙なし`}>{placeholder}</div>}</div>;
  return <div className="cover-container">
    {href && (present || !editable) ? <Link href={href} aria-label={`${title}の詳細`}>{cover}</Link> : cover}
    {editable && <input ref={input} type="file" accept="image/*" capture="environment" hidden onChange={async event => {
      const file = event.target.files?.[0]; event.target.value = "";
      if (!file) return;
      setBusy(true); setMessage("");
      try { const prepared = await preparePhoto(file); setPhoto(prepared); setPreview(URL.createObjectURL(prepared)); setChoosing(true); }
      catch (error) { setMessage(error instanceof Error ? error.message : "写真を読み込めませんでした。"); }
      finally { setBusy(false); }
    }}/>}
    {busy && !choosing && <p className="help" role="status">写真を準備しています…</p>}
    {message && !choosing && <p className="notice error" role="alert">{message}</p>}
    {editable && <dialog ref={dialog} className="cover-photo-dialog" onCancel={event => { if (busy) event.preventDefault(); else setChoosing(false); }}>
      <h2>表紙写真を確認</h2><p>{title} {volumeText}</p>
      {preview && <div className="cover-photo-preview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt="撮影した表紙写真"/>
      </div>}
      <p className="help">{copyId ? "本棚の公開設定に従って友達にも表示されます。" : "本棚に登録する時に、この写真も保存します。"}</p>
      {message && <p className="notice error" role="alert">{message}</p>}
      <div className="cover-photo-buttons"><button type="button" className="button" disabled={busy || !photo} onClick={async () => {
        if (!photo) return;
        if (onPhoto) { onPhoto(photo); setSavedUrl(preview); setChoosing(false); return; }
        setBusy(true); setMessage("");
        try {
          const form = new FormData(); form.set("copyId", copyId!); form.set("photo", photo);
          const result = await saveCoverPhoto(form);
          if (result.error) { setMessage(result.error); return; }
          setSavedUrl(result.url!); setChoosing(false);
        } catch { setMessage("写真を保存できませんでした。もう一度お試しください。"); }
        finally { setBusy(false); }
      }}>{busy ? "保存しています…" : copyId ? "写真を保存" : "この写真を使う"}</button><button type="button" className="button secondary" disabled={busy} onClick={() => input.current?.click()}>撮り直す</button><button type="button" className="button secondary" disabled={busy} onClick={() => { setChoosing(false); setMessage(""); }}>キャンセル</button></div>
    </dialog>}
  </div>;
}
