"use client";

import { useState } from "react";

export default function ComicCover({ title, volume, url }: { title: string; volume: number | null; url: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const allowed = url?.startsWith("https://") || url?.startsWith("/sample-covers/");
  const volumeText = volume === null ? "" : `${volume}巻`;
  return <div className="comic-cover">
    {url && allowed && failedUrl !== url ? (
      // Arbitrary book cover providers are supported without proxying private URLs.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt={`${title} ${volumeText}の表紙`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailedUrl(url)} />
    ) : <div className="cover-placeholder" role="img" aria-label={`${title} ${volumeText}・表紙なし`}><span aria-hidden="true">▥</span><strong>{title}</strong><span>{volumeText}</span><small>表紙なし</small></div>}
  </div>;
}
