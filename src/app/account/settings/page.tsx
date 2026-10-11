import Link from "next/link";
import { loadUserProfile } from "@/lib/profile-server";
export default async function Settings() {
  await loadUserProfile(true);
  return <><Link className="shelf-back" href="/account">← ホームへ</Link><p className="eyebrow">SETTINGS</p><h1>設定</h1><p className="intro">あなたの使いやすい本棚に。</p><Link className="settings-entry" href="/account/settings/profile"><span><strong>ユーザー情報</strong><small>ユーザーネームとアイコンの設定・変更</small></span><span aria-hidden="true">→</span></Link></>;
}
