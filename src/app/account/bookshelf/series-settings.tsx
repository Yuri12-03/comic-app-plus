"use client";
import { useActionState } from "react";
import { updateSeriesSetting } from "./actions";

export default function SeriesSettings({ id, title, isPublic, recommended }: { id: string; title: string; isPublic: boolean; recommended: boolean }) {
  const [state, action, pending] = useActionState(updateSeriesSetting, {});
  return <form action={action} className="series-settings" aria-label={`${title}の公開・おすすめ設定`}>
    <input type="hidden" name="seriesId" value={id}/>
    <button type="submit" name="change" value={`public:${!isPublic}`} disabled={pending} className={`shelf-setting-button ${isPublic ? "is-active" : ""}`} aria-label={`${title}を${isPublic ? "非公開" : "公開"}にする`} aria-pressed={isPublic}>{isPublic ? "公開" : "非公開"}</button>
    <button type="submit" name="change" value={`recommended:${!recommended}`} disabled={pending} className={`shelf-setting-button star-setting ${recommended ? "is-starred" : ""}`} aria-label={`${title}のおすすめ${recommended ? "を解除" : "に設定"}`} aria-pressed={recommended}>{recommended ? "★ おすすめ" : "☆ おすすめ"}</button>
    {state.error && <p className="setting-error" role="alert">{state.error}</p>}
  </form>;
}
