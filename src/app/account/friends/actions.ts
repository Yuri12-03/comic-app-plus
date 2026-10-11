"use server";
import { revalidatePath } from "next/cache";
import { loadUserProfile } from "@/lib/profile-server";
import { normalizeFriendCode, type FriendCandidate } from "@/lib/friends";
export type FriendState = { error?: string; success?: string; code?: string };
export async function findFriend(input:string):Promise<{ candidate?:FriendCandidate; error?:string }> {
  const {client,user}=await loadUserProfile(true,`/account/friends/add?code=${normalizeFriendCode(input) ?? ""}`);
  const code=normalizeFriendCode(input); if(!code) return {error:"16桁のフレンドIDを確認してください。"};
  const {data,error}=await client.rpc("find_friend",{p_code:code});
  if(error) return {error:"ユーザーを検索できませんでした。時間をおいて再度お試しください。"};
  const candidate=data?.[0];
  if(!candidate) return {error:"このフレンドIDのユーザーが見つかりませんでした。"};
  if(candidate.user_id===user.id) return {error:"自分自身にはフレンド申請できません。"};
  return {candidate:{...candidate,code}};
}
export async function requestFriend(_previous:FriendState,form:FormData):Promise<FriendState> {
  const {client}=await loadUserProfile(true);
  const code=normalizeFriendCode(String(form.get("code")??""));
  if(!code) return {error:"フレンドIDを確認してください。"};
  const {data,error}=await client.rpc("request_friend",{p_code:code});
  if(error) return {error:error.message.includes("SELF_REQUEST")?"自分自身には申請できません。":"申請できませんでした。フレンドIDを確認して再度お試しください。"};
  revalidatePath("/account/friends", "layout");
  return {code,success:data==="already_friends"?"すでに友達として登録されています。":data==="incoming"?"この友達から申請が届いています。友達管理で承認してください。":"フレンド申請を送りました。相手が承認すると、お互いの一覧に追加されます。"};
}
export async function respondFriend(_previous:FriendState,form:FormData):Promise<FriendState> {
  const {client}=await loadUserProfile(true);
  const id=String(form.get("connectionId")??"");const response=String(form.get("response")??"");
  if(!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(id)||!["accept","decline"].includes(response)) return {error:"申請を選び直してください。"};
  const {data,error}=await client.rpc("respond_friend",{p_id:id,p_accept:response==="accept"});
  if(error) return {error:"申請を更新できませんでした。時間をおいて再度お試しください。"};
  revalidatePath("/account/friends", "layout");
  return {success:data==="accepted"?"フレンド登録が完了しました。":"申請を見送りました。"};
}
