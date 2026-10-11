export function normalizeIsbn(input: string): string | null {
  const value = input.normalize("NFKC").replace(/[\s-]/g, "").toUpperCase();
  if (/^\d{9}[\dX]$/.test(value)) {
    const sum = [...value].reduce((total, digit, index) => total + (digit === "X" ? 10 : Number(digit)) * (10 - index), 0);
    if (sum % 11 !== 0) return null;
    const body = `978${value.slice(0, 9)}`;
    const check = (10 - [...body].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0) % 10) % 10;
    return `${body}${check}`;
  }
  if (!/^(978|979)\d{10}$/.test(value)) return null;
  const sum = [...value].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return sum % 10 === 0 ? value : null;
}

export function inferVolume(title: string, explicitVolume?: string): { title: string; volume: number | null } {
  const japaneseNumber = (value: string) => {
    const digits: Record<string, number> = { "〇": 0, "零": 0, "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9 };
    if (!/[十百千]/.test(value)) return String(Number([...value].map(char => digits[char]).join("")));
    let total = 0, digit = 0;
    for (const char of value) { const unit = ({ "十": 10, "百": 100, "千": 1000 } as Record<string, number>)[char]; if (unit) { total += (digit || 1) * unit; digit = 0; } else digit = digits[char]; }
    return String(total + digit);
  };
  const numeral = /[〇零一二三四五六七八九十百千]+/g;
  const normalized = title.normalize("NFKC").trim().replace(/(?:第[〇零一二三四五六七八九十百千]+巻|巻[〇零一二三四五六七八九十百千]+)/g, value => value.replace(numeral, japaneseNumber));
  const explicit = explicitVolume?.normalize("NFKC").replace(numeral, japaneseNumber).match(/^(?:第|巻)?\s*(\d+)\s*(?:巻)?(?:\s*\([^)]*\))?$/);
  const marked = normalized.match(/^(.*?)\s*(?:第\s*(\d+)\s*巻|巻\s*(\d+)|(\d+)\s*巻|(?:vol\.?|volume)\s*(\d+))(?:\s|[（(]|$)/i);
  if (marked?.[1].trim()) {
    const volume = explicit ? Number(explicit[1]) : Number(marked[2] ?? marked[3] ?? marked[4] ?? marked[5]);
    return { title: marked[1].trim(), volume: volume > 0 && volume <= 9999 ? volume : null };
  }
  const match = normalized.match(/(?:\s+|[（(])(?:第|巻)?\s*(\d+)\s*(?:巻)?[）)]?$/)
    ?? normalized.match(/第(\d+)巻$/);
  const volume = explicit ? Number(explicit[1]) : match ? Number(match[1]) : null;
  return { title: match ? normalized.slice(0, match.index).trim() : normalized, volume: volume && volume <= 9999 ? volume : null };
}

export type BookMetadata = {
  isbn: string;
  bookTitle: string;
  seriesTitle: string;
  volume: number | null;
  author: string;
  publisher: string;
  publishedDate: string;
  description: string;
  coverUrl: string;
  source: string;
  coverSource: string;
};

export function safeCoverUrl(value: string): string {
  if (!value) return "";
  try {
    const url = new URL(value.replace(/^http:/, "https:"));
    return url.protocol === "https:" && !url.username && !url.password && value.length <= 2000 ? url.href : "";
  } catch { return ""; }
}
