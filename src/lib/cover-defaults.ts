import type { BookMetadata } from "./isbn";

/** Check real image decoding, rather than treating a cover URL as an available cover. */
export function canDisplayCover(url: string, timeoutMs = 4000): Promise<boolean> {
  if (!url.startsWith("https://")) return Promise.resolve(false);
  return new Promise(resolve => {
    const image = new Image();
    const finish = (available: boolean) => {
      clearTimeout(timer);
      image.onload = null; image.onerror = null;
      if (!available) image.removeAttribute("src");
      resolve(available);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    image.referrerPolicy = "no-referrer";
    image.onload = () => finish(image.naturalWidth > 0 && image.naturalHeight > 0);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

export async function selectCoverDefaults(
  books: BookMetadata[], start: number, end: number,
  check: (url: string) => Promise<boolean> = canDisplayCover,
): Promise<Record<number, string>> {
  const chosen: Record<number, string> = {};
  const checks = new Map<string, Promise<boolean>>();
  const available = (url: string) => {
    if (!url) return Promise.resolve(false);
    if (!checks.has(url)) checks.set(url, check(url).catch(() => false));
    return checks.get(url)!;
  };
  await Promise.all(Array.from({ length: end - start + 1 }, async (_, index) => {
    const volume = start + index;
    const candidates = books.filter(book => book.volume === volume);
    if (candidates.length === 1) { chosen[volume] = candidates[0].isbn; return; }
    // Check in parallel, but select in the stable candidate order, not response-speed order.
    const covers = await Promise.all(candidates.map(book => available(book.coverUrl)));
    const preferred = candidates.find((_, candidateIndex) => covers[candidateIndex]);
    if (preferred) chosen[volume] = preferred.isbn;
  }));
  return chosen;
}
