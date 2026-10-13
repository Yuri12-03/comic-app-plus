"use server";
import { revalidatePath } from "next/cache";
import { requireBookshelfUser } from "@/lib/bookshelf-server";
export type LoanRequestState = { error?: string; sent?: boolean };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function sendLoanRequest(_previous: LoanRequestState, form: FormData): Promise<LoanRequestState> {
 const { client } = await requireBookshelfUser();
 const owner = String(form.get("owner") ?? "");
 const series = String(form.get("series") ?? "");
 const token = String(form.get("token") ?? "");
 const message = String(form.get("message") ?? "").trim();
 const copies = form.getAll("copies").map(String);
 if (![owner,series,token].every(value => uuid.test(value)) || !copies.length || copies.length > 50 || copies.some(value => !uuid.test(value)) || new Set(copies).size !== copies.length || [...message].length > 200)
   return { error: "借りたい巻を選び、メッセージは200文字以内で入力してください。" };
 try {
   const { data, error } = await client.rpc("send_loan_request", { p_owner: owner, p_series: series, p_copies: copies, p_message: message, p_token: token });
   if (error || !data) {
     if (error?.message.includes("TOKEN_CONFLICT")) return { error: "先ほどの申請は保存されています。送信した申請を確認してください。" };
     if (error?.message.includes("ALREADY_REQUESTED")) return { error: "選んだ巻には送信済みの申請があります。送信した申請を確認してください。" };
     if (error?.message.includes("FRIEND_NOT_FOUND") || error?.message.includes("BOOK_UNAVAILABLE")) return { error: "この本には申請できません。友達の本棚を開き直してください。" };
     return { error: "申請を送信できませんでした。入力は保持しています。もう一度お試しください。" };
   }
   revalidatePath("/account/requests");
   return { sent: true };
 } catch { return { error: "申請を送信できませんでした。入力は保持しています。もう一度お試しください。" }; }
}
