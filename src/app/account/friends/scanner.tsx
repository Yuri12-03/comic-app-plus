"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import type { DecodeHintType as DecodeHint } from "@zxing/library";
import { parseFriendQr } from "@/lib/friends";

async function createReader() {
  const [{ BrowserMultiFormatReader }, { BarcodeFormat, DecodeHintType }] = await Promise.all([import("@zxing/browser"), import("@zxing/library")]);
  const hints = new Map<DecodeHint, unknown>();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.QR_CODE]);
  hints.set(DecodeHintType.TRY_HARDER, true);
  return new BrowserMultiFormatReader(hints);
}

export default function FriendScanner({ onRead, disabled }: { onRead: (code: string) => void; disabled: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const controls = useRef<IScannerControls | null>(null);
  const generation = useRef(0);
  const [active, setActive] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [message, setMessage] = useState("");

  function releaseCamera() {
    controls.current?.stop();
    controls.current = null;
    const stream = video.current?.srcObject;
    if (typeof MediaStream !== "undefined" && stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    if (video.current) video.current.srcObject = null;
  }
  function stop() { generation.current += 1; releaseCamera(); setActive(false); }
  useEffect(() => () => { generation.current += 1; controls.current?.stop(); }, []);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia) { setMessage("この環境ではカメラが使えません。写真から読み取るか、フレンドIDを入力してください。"); return; }
    const current = ++generation.current;
    setActive(true);
    setMessage("友達のフレンド登録用QRコードを枠内に写してください。");
    try {
      const reader = await createReader();
      if (current !== generation.current || !video.current) return;
      const scan = await reader.decodeFromConstraints({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } }, video.current, (result, _error, scanControls) => {
        if (current !== generation.current || !result) return;
        const code = parseFriendQr(result.getText());
        if (!code) { setMessage("このアプリのフレンド登録用QRコードを写してください。"); return; }
        scanControls.stop();
        generation.current += 1;
        releaseCamera();
        setActive(false);
        setMessage("フレンドIDを読み取りました。");
        onRead(code);
      });
      if (current !== generation.current) scan.stop();
      else controls.current = scan;
    } catch (error) {
      if (current !== generation.current) return;
      stop();
      const name = error instanceof Error ? error.name : "";
      setMessage(name === "NotAllowedError" ? "カメラの利用が許可されていません。ブラウザの設定を確認するか、フレンドIDを入力してください。" : "カメラを起動できませんでした。写真から読み取るか、フレンドIDを入力してください。");
    }
  }

  async function readPhoto(file?: File) {
    if (!file) return;
    stop();
    if (file.size > 15 * 1024 * 1024) { setMessage("写真は15MB以下のものを選んでください。"); return; }
    const current = ++generation.current;
    setPhotoBusy(true);
    setMessage("写真のQRコードを読み取っています…");
    const url = URL.createObjectURL(file);
    try {
      const reader = await createReader();
      const result = await reader.decodeFromImageUrl(url);
      if (current !== generation.current) return;
      const code = parseFriendQr(result.getText());
      if (!code) { setMessage("このアプリのフレンド登録用QRコードを選んでください。"); return; }
      setMessage("フレンドIDを読み取りました。");
      onRead(code);
    } catch { if (current === generation.current) setMessage("読み取れませんでした。QRコードを明るく大きく撮るか、フレンドIDを入力してください。"); }
    finally { URL.revokeObjectURL(url); if (current === generation.current) setPhotoBusy(false); }
  }

  return <div className="isbn-scanner">
    <div className="scanner-actions"><button type="button" className="button" onClick={active ? stop : start} disabled={disabled || photoBusy}>{active ? "カメラを止める" : "カメラで読み取る"}</button><label className={`photo-button ${disabled || active || photoBusy ? "is-disabled" : ""}`}>写真から読み取る<input type="file" accept="image/*" disabled={disabled || active || photoBusy} onChange={(event) => { void readPhoto(event.target.files?.[0]); event.target.value = ""; }} /></label></div>
    <div className="camera-preview" hidden={!active}><video ref={video} muted autoPlay playsInline /><div className="scan-guide" aria-hidden="true" /></div>
    {message && <p className="help" role="status">{message}</p>}
    <p className="help">カメラや写真は端末内で処理します。検索に送るのはフレンドIDだけです。</p>
  </div>;
}
