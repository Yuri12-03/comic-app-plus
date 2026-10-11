"use client";

import { startTransition, useActionState, useRef, useState } from "react";
import ComicCover from "@/components/comic-cover";
import IsbnScanner from "@/components/isbn-scanner";
import { normalizeIsbn, type BookMetadata } from "@/lib/isbn";
import { lookupIsbn, registerComic } from "./actions";
import RangeForm from "./range-form";
import TitleSearchForm from "./title-search-form";

type SeriesOption = { id: string; title: string; author: string | null };

function BookConfirmation({ book, series }: { book: BookMetadata; series: SeriesOption[] }) {
  const [state, action, pending] = useActionState(registerComic, {});
  const [token] = useState(() => crypto.randomUUID());
  const match = series.find((item) => item.title.normalize("NFKC").replace(/\s/g, "").toLowerCase() === book.seriesTitle.replace(/\s/g, "").toLowerCase());
  const [seriesId, setSeriesId] = useState(match?.id ?? "");
  const [coverUrl, setCoverUrl] = useState(book.coverUrl);
  return <section className="registration-confirmation" aria-labelledby="confirm-heading">
    <div className="registration-step"><span>02</span><h2 id="confirm-heading">内容を確認して、本棚へ</h2></div>
    <div className="registration-book-summary"><ComicCover title={book.bookTitle || "登録する漫画"} volume={book.volume} url={coverUrl || null} /><div><span className="comic-owned">ISBN {book.isbn}</span><h3>{book.bookTitle || "情報を入力してください"}</h3>{book.publisher && <p>{book.publisher} / {book.publishedDate}</p>}<p className="help">書誌情報：{book.source}{book.coverSource && ` / 表紙：${book.coverSource}`}</p></div></div>
    <p className="help">作品名は各巻をまとめる名前です。巻数や追加先が正しいか確認してください。</p>
    <form className="auth-form" onReset={(event) => event.preventDefault()} onSubmit={(event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      startTransition(() => action(form));
    }}>
      <input type="hidden" name="isbn" value={book.isbn} /><input type="hidden" name="token" value={token} />
      <input type="hidden" name="bookTitle" value={book.bookTitle} /><input type="hidden" name="publisher" value={book.publisher} /><input type="hidden" name="publishedDate" value={book.publishedDate} />
      <fieldset disabled={pending} className="registration-fields">
        {series.length > 0 && <label className="field">追加先の作品<select name="seriesId" value={seriesId} onChange={(event) => setSeriesId(event.target.value)}><option value="">作品名・著者からまとめる</option>{series.map((item) => <option key={item.id} value={item.id}>{item.title}{item.author ? `（${item.author}）` : ""}</option>)}</select><span className="help">既存の作品を選ぶと、その作品の所持巻に追加します。</span></label>}
        <label className="field">作品名<input name="title" required maxLength={200} defaultValue={book.seriesTitle} placeholder="例：ONE PIECE" /></label>
        <div className="registration-two-fields"><label className="field">巻数<input name="volume" required type="number" inputMode="numeric" min="1" max="9999" step="1" defaultValue={book.volume ?? ""} placeholder="例：1" /></label><label className="field">著者<input name="author" maxLength={500} defaultValue={book.author} /></label></div>
        <label className="field">作品紹介<textarea name="description" rows={4} maxLength={5000} defaultValue={book.description} /></label>
        <label className="field">表紙画像のURL<input name="coverUrl" type="url" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://…（任意）" maxLength={2000} /><span className="help">表紙が取得できない場合は空欄でも登録できます。</span></label>
        {state.duplicate && <label className="duplicate-confirm"><input type="checkbox" name="allowDuplicate" />同じISBNをもう1冊持っているので追加する</label>}
      </fieldset>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      <button className="button" disabled={pending}>{pending ? "本棚に保存しています…" : "自分の本棚に登録する"}</button>
    </form>
  </section>;
}

export default function RegisterForm({ series }: { series: SeriesOption[] }) {
  const [searchMode, setSearchMode] = useState("isbn");
  const [mode, setMode] = useState("single");
  const [isbn, setIsbn] = useState("");
  const [book, setBook] = useState<BookMetadata | null>(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const requestId = useRef(0);
  async function lookup(value: string) {
    const current = ++requestId.current;
    setIsbn(value); setBook(null); setMessage("");
    if (!normalizeIsbn(value)) { setBusy(false); setMessage("ISBNの桁数・数字を確認してください。価格のバーコードは使えません。"); return; }
    setBusy(true);
    try {
      const result = await lookupIsbn(value);
      if (current !== requestId.current) return;
      setBook(result.book ?? null); setMessage(result.error ?? "");
    } catch { if (current === requestId.current) setMessage("情報を取得できませんでした。もう一度お試しください。"); }
    finally { if (current === requestId.current) setBusy(false); }
  }
  return <>
    <div className="registration-mode" role="group" aria-label="漫画の探し方"><button type="button" className={`button ${searchMode === "isbn" ? "" : "secondary"}`} aria-pressed={searchMode === "isbn"} onClick={() => { ++requestId.current; setBusy(false); setSearchMode("isbn"); setBook(null); setMessage(""); }}>ISBNで登録</button><button type="button" className={`button ${searchMode === "title" ? "" : "secondary"}`} aria-pressed={searchMode === "title"} onClick={() => { ++requestId.current; setBusy(false); setSearchMode("title"); setBook(null); setMessage(""); }}>漫画名で検索</button></div>
    {searchMode === "title" ? <TitleSearchForm onSearch={() => setBook(null)} onSelect={selected => { setBook(selected); setMode("range"); }}/>: <section className="registration-isbn" aria-labelledby="isbn-heading"><div className="registration-step"><span>01</span><h2 id="isbn-heading">ISBNを読み取る</h2></div><IsbnScanner disabled={busy} onRead={(value) => void lookup(value)} />
      <form className="isbn-search" onSubmit={(event) => { event.preventDefault(); void lookup(isbn); }}><label className="field">ISBNを手入力<input value={isbn} disabled={busy} onChange={(event) => { setIsbn(event.target.value); setBook(null); setMessage(""); }} placeholder="例：9784088725093" maxLength={24} autoComplete="off" /></label><button className="button" disabled={busy || !isbn.trim()}>{busy ? "情報を取得中…" : "書誌情報を取得"}</button></form>
      <p className="help">10桁・13桁、ハイフン付きのISBNも使えます。</p>{message && <p className="notice" role="status">{message}</p>}
    </section>}
    {book && <><div className="registration-mode" role="group" aria-label="登録方法"><button className={`button ${mode === "single" ? "" : "secondary"}`} onClick={() => setMode("single")}>1冊だけ追加</button><button className={`button ${mode === "range" ? "" : "secondary"}`} onClick={() => setMode("range")}>巻数の範囲で追加</button></div>{mode === "single" ? <BookConfirmation key={book.isbn} book={book} series={series} /> : <RangeForm key={book.isbn} book={book} series={series} fromTitle={searchMode === "title"} />}</>}
  </>;
}
