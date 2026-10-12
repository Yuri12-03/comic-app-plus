import Link from "next/link";
import {connection} from "next/server";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {normalizeFriendCode} from "@/lib/friends";
import {findFriend} from "../actions";
import FriendRequestForm from "../request-form";
export default async function AddFriend({searchParams}:{searchParams:Promise<{code?:string}>}) {
  await connection();const query=await searchParams;const code=normalizeFriendCode(query.code??"");
  const next=code?`/account/friends/add?code=${code}`:"/account/friends/manage";
  const client=await createClient();const auth=client?await client.auth.getUser():null;
  if(!auth?.data.user) redirect(`/login?next=${encodeURIComponent(next)}`);
  const result=code?await findFriend(code):{error:"QRコードのフレンドIDが正しくありません。友達管理から追加してください。"};
  return <><Link className="shelf-back" href="/account/friends/manage">← 友達管理へ</Link><h1>フレンド申請</h1><FriendRequestForm initialCandidate={result.candidate} initialError={result.error}/></>;
}
