"use client";

import { startTransition, useActionState, useState } from "react";
import ComicCover from "@/components/comic-cover";
import type { BookMetadata } from "@/lib/isbn";
import { selectCoverDefaults } from "@/lib/cover-defaults";
import { lookupOwnedSeriesRange, lookupRange, registerRange } from "./actions";

type SeriesOption = { id: string; title: string; author: string | null };
type Candidate = BookMetadata & { token: string };
export default function RangeForm({ book, series, target }: { book: BookMetadata; series: SeriesOption[]; target?: SeriesOption & { nextVolume: number } }) {
  const [start, setStart] = useState(String(target?.nextVolume ?? 1));
  const [end, setEnd] = useState(String(target?.nextVolume ?? book.volume ?? 1));
  const [multiple, setMultiple] = useState(!target);
  const [result, setResult] = useState<{ start: number; end: number; books: Candidate[] } | null>(null);
  const [selected, setSelected] = useState<Record<number, string>>({});
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingCovers, setCheckingCovers] = useState(false);
  const [state, action, pending] = useActionState(registerRange, {});
  const selectedBooks = result?.books.filter(item => selected[item.volume!] === item.isbn) ?? [];
  const match = series.find(item => item.title.normalize("NFKC").replace(/\s/g, "").toLowerCase() === book.seriesTitle.normalize("NFKC").replace(/\s/g, "").toLowerCase());
  return <section className="registration-confirmation" aria-labelledby="range-heading">
    <div className="registration-step"><span>{target ? "01" : "02"}</span><h2 id="range-heading">{target ? "購入した巻を追加" : "巻数の範囲で、まとめて追加"}</h2></div>
    <p>{book.seriesTitle || book.bookTitle}</p>
    <form className="auth-form" onSubmit={async event => {
      event.preventDefault(); setBusy(true); setMessage(""); setResult(null);
      try {
        const last = multiple ? Number(end) : Number(start);
        const response = target ? await lookupOwnedSeriesRange(target.id, Number(start), last) : await lookupRange(book.isbn, Number(start), last);
        if (response.error) { setMessage(response.error); return; }
        const books = (response.books ?? []).map(item => ({ ...item, token: crypto.randomUUID() }));
        setCheckingCovers(true);
        const chosen = await selectCoverDefaults(books, Number(start), last);
        setSelected(chosen); setResult({ start: Number(start), end: last, books });
      } catch { setMessage("検索できませんでした。もう一度お試しください。"); }
      finally { setBusy(false); setCheckingCovers(false); }
    }}>
      <fieldset disabled={busy || pending} className="registration-fields">
        {target && <label className="duplicate-confirm"><input type="checkbox" checked={multiple} onChange={event => { setMultiple(event.target.checked); setEnd(start); }} />複数巻をまとめて追加</label>}
        <div className="registration-two-fields"><label className="field">{multiple ? "開始巻" : "追加する巻数"}<input type="number" min="1" max="9999" required value={start} onChange={event => setStart(event.target.value)} /></label>{multiple && <label className="field">終了巻<input type="number" min="1" max="9999" required value={end} onChange={event => setEnd(event.target.value)} /></label>}</div></fieldset>
      <p className="help">{target ? "ISBNの読み取りは不要です。巻数からこの作品の本を探します。" : "1冊のISBNから同じ作品の各巻を探します。"}一度に50冊まで追加できます。</p>
      <button className="button secondary" disabled={busy || pending}>{busy ? checkingCovers ? "表紙を確認しています…" : "各巻を探しています…" : "この範囲の漫画を探す"}</button>
    </form>
    {message && <p className="notice" role="alert">{message}</p>}
    {result && <form className="auth-form range-results" onReset={event => event.preventDefault()} onSubmit={event => { event.preventDefault(); const form = new FormData(event.currentTarget); startTransition(() => action(form)); }}>
      <h3>追加する巻を確認</h3><p className="help">複数の候補がある巻は、表紙を表示できた候補を優先して選んでいます。通常版・新装版など、持っている本と一致するISBNか確認してください。見つからない巻や除外した巻は保存されません。</p>
      <fieldset disabled={pending || busy} className="registration-fields">
        {Array.from({ length: result.end - result.start + 1 }, (_, index) => result.start + index).map(volume => {
          const candidates = result.books.filter(item => item.volume === volume);
          const current = candidates.find(item => item.isbn === selected[volume]);
          return <div className="range-book" key={volume}>
            <ComicCover title={book.seriesTitle} volume={volume} url={current?.coverUrl || null} />
            <div><label className="field">{volume}巻<select aria-label={`${volume}巻のISBN`} value={selected[volume] ?? ""} onChange={event => setSelected({ ...selected, [volume]: event.target.value })}><option value="">{candidates.length ? "追加しない / 候補を選択" : "情報が見つかりませんでした"}</option>{candidates.map(item => <option key={item.isbn} value={item.isbn}>{item.isbn} / {item.publisher} / {item.publishedDate}</option>)}</select></label>{current && <p className="help">{current.bookTitle}</p>}{candidates.length > 1 && <p className="help">複数の候補があります。ISBNを確認して選んでください。</p>}</div>
          </div>;
        })}
        <input type="hidden" name="books" value={JSON.stringify(selectedBooks.map(({ isbn, volume, token }) => ({ isbn, volume, token })))} />
        {target ? <><p>追加先：{target.title}</p><input type="hidden" name="title" value={target.title} /><input type="hidden" name="author" value={target.author ?? ""} /><input type="hidden" name="seriesId" value={target.id} /></> : <>
        <label className="field">作品名<input name="title" maxLength={200} required defaultValue={book.seriesTitle} /></label>
        <label className="field">著者<input name="author" maxLength={500} defaultValue={book.author} /></label>
        {series.length > 0 && <label className="field">追加先の作品<select name="seriesId" defaultValue={match?.id ?? ""}><option value="">作品名・著者からまとめる</option>{series.map(item => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>}
        </>}
        {state.duplicate && <label className="duplicate-confirm"><input name="allowDuplicate" type="checkbox" />登録済みのISBNも、追加の実物を持っているので保存する</label>}
      </fieldset>
      {state.error && <p className="notice error" role="alert">{state.error}</p>}
      <p role="status">{selectedBooks.length}冊を追加します（{result.end - result.start + 1 - selectedBooks.length}巻を除外）</p>
      <button className="button" disabled={pending || busy || !selectedBooks.length}>{pending ? "まとめて保存しています…" : `${selectedBooks.length}冊をまとめて本棚に登録`}</button>
    </form>}
  </section>;
}
