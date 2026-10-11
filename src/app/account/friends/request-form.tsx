"use client";
import Link from "next/link";
import {useActionState,useState} from "react";
import UserAvatar from "@/components/user-avatar";
import {formatFriendCode,type FriendCandidate} from "@/lib/friends";
import {findFriend,requestFriend} from "./actions";
import FriendScanner from "./scanner";
export default function FriendRequestForm({initialCandidate,initialError}:{initialCandidate?:FriendCandidate;initialError?:string}) {
  const [mode,setMode]=useState("id");const [input,setInput]=useState(initialCandidate?.code??"");const [candidate,setCandidate]=useState(initialCandidate);const [error,setError]=useState(initialError??"");const [busy,setBusy]=useState(false);
  const [state,action,pending]=useActionState(requestFriend,{});
  async function lookup(code:string) {setInput(code);setCandidate(undefined);setError("");setBusy(true);try{const result=await findFriend(code);setCandidate(result.candidate);setError(result.error??"");}catch{setError("検索できませんでした。もう一度お試しください。");}finally{setBusy(false);}}
  return <section className="profile-card"><h2>友達を追加</h2><div className="friend-methods"><button type="button" className={`button ${mode==="id"?"":"secondary"}`} aria-pressed={mode==="id"} disabled={busy||pending} onClick={()=>setMode("id")}>IDで追加</button><button type="button" className={`button ${mode==="qr"?"":"secondary"}`} aria-pressed={mode==="qr"} disabled={busy||pending} onClick={()=>setMode("qr")}>QRで追加</button></div>
    {mode==="qr"?<FriendScanner disabled={busy||pending} onRead={code=>void lookup(code)}/>:<form className="auth-form" onSubmit={event=>{event.preventDefault();void lookup(input);}}><label className="field">相手のフレンドID<input value={input} onChange={event=>{setInput(event.target.value);setCandidate(undefined);}} placeholder="ABCD-1234-EF56-7890" maxLength={40} autoComplete="off" required disabled={busy||pending}/></label><button className="button secondary" disabled={busy||pending}>{busy?"検索しています…":"相手を確認"}</button></form>}
    {error&&<p className="notice error" role="alert">{error}</p>}
    {candidate&&<form action={action} className="auth-form friend-confirm"><div className="friend-person"><UserAvatar preset={candidate.avatar_preset}/><div><strong>{candidate.display_name}</strong><small>{formatFriendCode(candidate.code)}</small></div></div><input type="hidden" name="code" value={candidate.code}/><p className="help">相手を確認して申請してください。承認後にお互いの友達一覧へ追加されます。</p><button className="button" disabled={pending||busy}>{pending?"申請しています…":"フレンド申請を送る"}</button></form>}
    {(state.error||(state.success&&state.code===candidate?.code))&&<p className={`notice${state.error?" error":""}`} role={state.error?"alert":"status"}>{state.error||state.success}</p>}
    {state.success&&state.code===candidate?.code&&<Link href="/account/friends/manage">友達管理で申請を確認 →</Link>}
  </section>;
}
