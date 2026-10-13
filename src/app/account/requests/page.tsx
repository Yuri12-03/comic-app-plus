import Link from "next/link";
import { requireBookshelfUser } from "@/lib/bookshelf-server";
type SentRequest = { id: string; series_title: string; owner_name: string; message: string; created_at: string; loan_request_items: { copy_id: string; volume_number: number }[] };
export default async function SentRequests() {
 const { client, userId } = await requireBookshelfUser();
 const { data, error } = await client.from("loan_requests").select("id,series_title,owner_name,message,created_at,loan_request_items(copy_id,volume_number)").eq("requester_id",userId).order("created_at",{ascending:false});
 return <><Link className="shelf-back" href="/account">← ホームへ</Link><h1>送信した貸出申請</h1>
 {error ? <p className="notice error" role="alert">申請を読み込めませんでした。時間をおいて再度お試しください。</p> : !data?.length ? <p>送信した申請はありません。</p> : <div className="sent-loan-list">{(data as SentRequest[]).map(request => <article key={request.id} className="profile-card"><h2>{request.series_title}</h2><p>申請先：{request.owner_name}</p><p>巻数：{[...request.loan_request_items].sort((a,b)=>a.volume_number-b.volume_number).map(copy=>`${copy.volume_number}巻`).join("・")}</p>{request.message && <p className="loan-message">{request.message}</p>}<p className="help">{new Date(request.created_at).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"})} / 申請済み</p></article>)}</div>}
 <Link className="button secondary" href="/account/friends">友達の本棚を見る</Link></>;
}
