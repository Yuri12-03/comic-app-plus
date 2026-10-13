"use client";
import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import type { ComicCopy } from "@/lib/bookshelf";
import { sendLoanRequest } from "./actions";
export default function LoanRequestForm({ ownerId, seriesId, ownerName, copies }: { ownerId: string; seriesId: string; ownerName: string; copies: ComicCopy[] }) {
 const [state, action, pending] = useActionState(sendLoanRequest, {});
 const [token] = useState(() => crypto.randomUUID());
 const [selected, setSelected] = useState<string[]>([]);
 const [message, setMessage] = useState("");
 return <section id="loan-request" className="loan-request-section"><h2>貸出申請</h2>
   <p>申請先：{ownerName}</p>
   {state.sent ? <div className="notice" role="status"><p>貸出申請を送りました。</p><Link href="/account/requests">送信した申請を確認 →</Link></div> : <form className="auth-form" onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(() => action(form)); }}>
     <input type="hidden" name="owner" value={ownerId}/><input type="hidden" name="series" value={seriesId}/><input type="hidden" name="token" value={token}/>
     <fieldset className="registration-fields" disabled={pending}><legend>借りたい巻（複数選択可・50冊まで）</legend>
       <div className="loan-copy-options">{copies.map((copy,index) => <label className="loan-copy-option" key={copy.id}><input type="checkbox" name="copies" value={copy.id} checked={selected.includes(copy.id)} onChange={event => setSelected(previous => event.target.checked ? [...previous,copy.id] : previous.filter(id => id !== copy.id))}/><span><strong>{copy.volume_number}巻{copies.filter(item => item.volume_number === copy.volume_number).length > 1 ? `（${copies.slice(0,index+1).filter(item => item.volume_number === copy.volume_number).length}冊目）` : ""}</strong><small>{copy.book_title}{copy.isbn && ` / ISBN ${copy.isbn}`}</small></span></label>)}</div>
       <label className="field">メッセージ（任意・200文字まで）<textarea name="message" rows={3} value={message} onChange={event => setMessage(event.target.value)} aria-describedby="loan-message-count"/><span id="loan-message-count" className="help">{[...message].length}/200文字</span></label>
     </fieldset>
     {state.error && <p className="notice error" role="alert">{state.error}</p>}
     <p className="help">{selected.length}冊を選択しています。</p>
     <button className="button" disabled={pending || !selected.length || selected.length > 50 || [...message.trim()].length > 200}>{pending ? "送信しています…" : "貸出申請を送る"}</button>
     <Link href="/account/requests">送信した申請を確認 →</Link>
   </form>}
 </section>;
}
