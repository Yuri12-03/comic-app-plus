import Link from "next/link";
import QRCode from "qrcode";
import UserAvatar from "@/components/user-avatar";
import {loadFriends} from "@/lib/friends-server";
import {formatFriendCode} from "@/lib/friends";
import FriendRequestForm from "../request-form";
import RespondForm from "../respond-form";
export default async function ManageFriends() {
  const {code,friends,failed}=await loadFriends();
  if(failed||!code) return <p className="notice error" role="alert">友達の情報を読み込めませんでした。時間をおいて再度お試しください。</p>;
  const qr=await QRCode.toString(`https://comic-app-plus.vercel.app/account/friends/add?code=${code}`,{type:"svg",errorCorrectionLevel:"M",margin:4});
  const incoming=friends.filter(item=>item.status==="pending"&&item.incoming);const sent=friends.filter(item=>item.status==="pending"&&!item.incoming);
  return <><Link className="shelf-back" href="/account">← ホームへ</Link><p className="eyebrow">FRIENDS / CONNECT</p><h1>友達管理</h1><p className="intro">IDやQRコードでつながって、読書の輪をひろげよう。</p>
    <section className="profile-card own-friend-code"><h2>あなたのフレンドID</h2><strong className="friend-code">{formatFriendCode(code)}</strong><p className="help">このIDを友達に伝えるか、QRコードを読み取ってもらってください。</p><div className="friend-qr" role="img" aria-label="あなたのフレンド登録用QRコード" dangerouslySetInnerHTML={{__html:qr}}/><p className="help">スマホのカメラでも読み取れます。読み取りだけでは登録されず、申請と承認が必要です。</p></section>
    <FriendRequestForm/>
    <section className="friend-requests"><h2>届いた申請 <small>{incoming.length}件</small></h2>{incoming.length?incoming.map(friend=><article className="friend-list-card" key={friend.connection_id}><div className="friend-person"><UserAvatar preset={friend.avatar_preset}/><div><strong>{friend.display_name}</strong><small>{formatFriendCode(friend.friend_code)}</small></div></div><RespondForm id={friend.connection_id}/></article>):<p className="help">届いている申請はありません。</p>}</section>
    <section className="friend-requests"><h2>承認待ちの申請 <small>{sent.length}件</small></h2>{sent.length?sent.map(friend=><div className="friend-list-card" key={friend.connection_id}><div className="friend-person"><UserAvatar preset={friend.avatar_preset}/><div><strong>{friend.display_name}</strong><small>相手の承認を待っています</small></div></div></div>):<p className="help">送信中の申請はありません。</p>}</section><Link className="button secondary" href="/account/friends">友達の一覧を見る →</Link>
  </>;
}
