export type ComicCopy = {
  id: string;
  volume_number: number;
  isbn: string | null;
  cover_url: string | null;
  cover_path?: string | null;
  book_title?: string | null;
  publisher?: string | null;
  published_date?: string | null;
  metadata_source?: string | null;
};
export type ComicSeries = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  is_public?: boolean;
  is_recommended?: boolean;
  comic_copies: ComicCopy[];
};

export function sortedCopies(series: ComicSeries) {
  return [...series.comic_copies].sort((a, b) => a.volume_number - b.volume_number || a.id.localeCompare(b.id));
}

export function summarizeSeries(series: ComicSeries) {
  const copies = sortedCopies(series);
  return { series, coverCopy: copies[0], copyCount: copies.length, volumes: [...new Set(copies.map((copy) => copy.volume_number))] };
}

export function volumeLabel(volumes: number[]) {
  return volumes.map((volume) => `${volume}巻`).join("・");
}
