import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/app/auth/actions";
import { loadUserProfile } from "@/lib/profile-server";
import ProfileForm from "../settings/profile/profile-form";
export default async function Onboarding() {
  const { profile, photoUrl, failed } = await loadUserProfile();
  if (profile) redirect("/account");
  return <div className="site"><header className="dashboard-header"><Link className="brand" href="/account">▥ まんがのわ</Link><form action={signOut}><button className="logout-button">ログアウト</button></form></header><main className="profile-shell"><p className="eyebrow">WELCOME / STEP 2</p><h1>あなたのプロフィールを<br />つくりましょう。</h1><p className="intro">本棚で使うユーザーネームとアイコンを選んでください。あとから設定で変更できます。</p>{failed ? <p className="notice error" role="alert">設定画面を準備できませんでした。時間をおいて再度お試しください。</p> : <ProfileForm profile={null} photoUrl={photoUrl} onboarding />}</main></div>;
}
