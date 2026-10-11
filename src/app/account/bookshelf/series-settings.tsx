"use client";
import { useActionState, useOptimistic } from "react";
import { updateSeriesSetting } from "./actions";

export default function SeriesSettings({ id, title, isPublic, recommended }: { id: string; title: string; isPublic: boolean; recommended: boolean }) {
  const [display, setDisplay] = useOptimistic(
    { isPublic, recommended },
    (current, change: { setting: string; value: boolean }) => change.setting === "public"
      ? { ...current, isPublic: change.value }
      : { ...current, recommended: change.value },
  );
  const [state, action, pending] = useActionState(async (previous: { error?: string }, form: FormData) => {
    const [setting, value] = String(form.get("change") ?? "").split(":");
    setDisplay({ setting, value: value === "true" });
    try {
      return await updateSeriesSetting(previous, form);
    } catch {
      return { error: "設定を保存できませんでした。通信状態を確認して、もう一度お試しください。" };
    }
  }, {});
  return <form action={action} className="series-settings" aria-label={`${title}の公開・おすすめ設定`}>
    <input type="hidden" name="seriesId" value={id}/>
    <button type="submit" name="change" value={`public:${!display.isPublic}`} disabled={pending} className={`shelf-setting-button ${display.isPublic ? "is-active" : ""}`} aria-label={`${title}を${display.isPublic ? "非公開" : "公開"}にする`} aria-pressed={display.isPublic}>{display.isPublic ? "公開" : "非公開"}</button>
    <button type="submit" name="change" value={`recommended:${!display.recommended}`} disabled={pending} className={`shelf-setting-button star-setting ${display.recommended ? "is-starred" : ""}`} aria-label={`${title}のおすすめ${display.recommended ? "を解除" : "に設定"}`} aria-pressed={display.recommended}>{display.recommended ? "★ おすすめ" : "☆ おすすめ"}</button>
    {pending && <span className="setting-saving" role="status">保存中…</span>}
    {state.error && <p className="setting-error" role="alert">{state.error}</p>}
  </form>;
}
