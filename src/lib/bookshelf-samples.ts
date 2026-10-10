import type { ComicSeries } from "./bookshelf";

// Fictional preview data only; never inserted into the user's bookshelf.
export const sampleSeries: ComicSeries[] = [
  { id: "sample-hoshi", title: "星をあつめる日々", author: "まんがのわ編集部", description: "小さな天文部を舞台に、放課後の空を見上げる物語。画面確認用の架空の作品です。", comic_copies: [3, 5, 10].map((volume) => ({ id: `hoshi-${volume}`, volume_number: volume, isbn: null, cover_url: volume === 3 ? "/sample-covers/hoshi.svg" : null })) },
  { id: "sample-kissa", title: "喫茶こもれび", author: "まんがのわ編集部", description: "街角の喫茶店に集まる人たちの、あたたかな日常。画面確認用の架空の作品です。", comic_copies: [1, 2, 3, 4].map((volume) => ({ id: `kissa-${volume}`, volume_number: volume, isbn: null, cover_url: volume === 1 ? "/sample-covers/kissa.svg" : null })) },
  { id: "sample-tabiji", title: "風の旅路", author: "まんがのわ編集部", description: "旅人と猫が、知らない街を巡る冒険。画面確認用の架空の作品です。", comic_copies: [2, 4].map((volume) => ({ id: `tabiji-${volume}`, volume_number: volume, isbn: null, cover_url: volume === 2 ? "/sample-covers/tabiji.svg" : null })) },
  { id: "sample-hakoniwa", title: "箱庭の冒険", author: null, description: "表紙がないときの表示を確認するための、架空の作品です。", comic_copies: [{ id: "hakoniwa-7", volume_number: 7, isbn: null, cover_url: null }] },
];
