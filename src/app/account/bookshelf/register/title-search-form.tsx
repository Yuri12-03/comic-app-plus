"use client";
import { useState } from "react";
import ComicCover from "@/components/comic-cover";
import type { BookMetadata } from "@/lib/isbn";
import { lookupTitle } from "./actions";

export default function TitleSearchForm({ onSelect, onSearch, selected }: { onSelect: (book: BookMetadata) => void; onSearch: () => void; selected: BookMetadata | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BookMetadata[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (selected) return <section className="registration-isbn" aria-label="選択した作品"><div className="registration-step"><span>01</span><h2>選択した作品</h2></div><div className="title-search-candidate"><ComicCover title={selected.seriesTitle} volume={selected.volume} url={selected.coverUrl || null}/><div><h4>{selected.seriesTitle}</h4><p>{selected.author}</p><p>{selected.publisher}</p><button type="button" className="button secondary" onClick={onSearch}>別の作品を選ぶ</button></div></div></section>;
  return <section className="registration-isbn" aria-labelledby="title-search-heading">
    <div className="registration-step"><span>01</span><h2 id="title-search-heading">漫画名から探す</h2></div>
    <form className="isbn-search" onSubmit={async event => {
      event.preventDefault(); onSearch(); setBusy(true); setMessage(""); setResults([]);
      try {
        const result = await lookupTitle(query);
        setResults(result.books ?? []); setMessage(result.error ?? "");
      } catch { setMessage("検索できませんでした。もう一度お試しください。"); }
      finally { setBusy(false); }
    }}>
      <label className="field">漫画名<input required minLength={2} maxLength={100} value={query} disabled={busy} onChange={event => setQuery(event.target.value)} placeholder="例：ONE PIECE"/></label>
      <button className="button" disabled={busy || query.trim().length < 2}>{busy ? "漫画を検索しています…" : "漫画名で検索"}</button>
    </form>
    <p className="help">作者・出版社を確認して選んでください。候補は最大12作品。通常版・新装版など、版によって所持巻の情報が異なる場合があります。</p>
    {busy && <p role="status">候補と表紙を探しています…</p>}
    {message && <p className="notice" role="status">{message}</p>}
    {results.length > 0 && <><h3>作品を選択</h3><div className="title-search-results">{results.map(book => <article className="title-search-candidate" key={book.isbn}>
      <ComicCover title={book.seriesTitle} volume={book.volume} url={book.coverUrl || null}/>
      <div><h4>{book.seriesTitle}</h4><p>{book.author || "著者情報なし"}</p><p>{book.publisher || "出版社情報なし"}</p><p className="help">候補の本：{book.volume ? `${book.volume}巻 / ` : ""}ISBN {book.isbn}</p><button className="button secondary" type="button" onClick={() => onSelect(book)}>この作品を選ぶ<span className="sr-only">：{book.seriesTitle} {book.publisher}</span></button></div>
    </article>)}</div></>}
  </section>;
}
