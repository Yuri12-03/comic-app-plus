"use client";

import { useState } from "react";

const sections = [
  { title: "本棚をひらく", subtitle: "読む楽しみを、身近な人と。", items: [
    { title: "自分の本棚", description: "持っている漫画を、ひとつの場所に。", icon: "books", color: "green" },
    { title: "漫画を登録", description: "ISBNを読み取って、本棚に追加。", icon: "plus", color: "gold" },
    { title: "グループの本棚", description: "サークルや研究室の漫画を共有。", icon: "group", color: "blue" },
    { title: "友達の本棚", description: "友達の一冊から、次の出会いを。", icon: "book", color: "rose" },
  ] },
  { title: "貸し借りを管理", subtitle: "申請から返却まで、忘れずに。", items: [
    { title: "貸出申請", description: "届いた申請・送った申請を確認。", icon: "mail", color: "gold" },
    { title: "貸し借り一覧", description: "貸している本・借りている本と期限。", icon: "arrows", color: "green" },
  ] },
  { title: "つながりと設定", subtitle: "あなたの使いやすい本棚に。", items: [
    { title: "友達管理", description: "友達を追加して、本棚をつなげる。", icon: "person", color: "rose" },
    { title: "設定", description: "アカウントや通知の設定はこちら。", icon: "settings", color: "blue" },
  ] },
];

function Icon({ type }: { type: string }) {
  const paths: Record<string, React.ReactNode> = {
    books: <><path d="M4 4h4v16H4zM10 4h4v16h-4zM16 5l4-1 4 15-4 1z" /><path d="M4 8h4m2 8h4" /></>,
    plus: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M12 8v8m-4-4h8" /></>,
    group: <><circle cx="9" cy="8" r="3" /><path d="M3 20v-3a6 6 0 0112 0v3m1-15a3 3 0 010 6m2 3a5 5 0 013 5" /></>,
    book: <><path d="M12 6C8 3 4 4 2 5v15c3-2 7-2 10 0 3-2 7-2 10 0V5c-2-1-6-2-10 1zm0 0v14" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 7l9 6 9-6" /></>,
    arrows: <><path d="M4 7h16m-4-4l4 4-4 4M20 17H4m4-4l-4 4 4 4" /></>,
    person: <><circle cx="9" cy="8" r="3" /><path d="M3 21v-3a6 6 0 0112 0v3m4-13v6m-3-3h6" /></>,
    settings: <><circle cx="12" cy="12" r="4" /><path d="M12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10l2 2M5 19l2-2M17 7l2-2" /></>,
  };
  return <svg width="26" height="26" viewBox="0 0 26 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[type]}</svg>;
}

export default function Dashboard() {
  const [selected, setSelected] = useState<string | null>(null);
  return <>
    <div className="dashboard-development"><span className="development-dot" />ただいま準備中です。各ボタンから、追加予定の機能を確認できます。</div>
    {selected && <div className="dashboard-feedback" role="status"><div><strong>{selected}</strong><p>この機能はこれから追加予定です。もう少しお待ちください。</p></div><button onClick={() => setSelected(null)} aria-label="案内を閉じる">×</button></div>}
    {sections.map((section, index) => <section className="dashboard-section" key={section.title} aria-labelledby={`section-${index}`}>
      <div className="dashboard-section-heading"><h2 id={`section-${index}`}>{section.title}</h2><p>{section.subtitle}</p></div>
      <div className={`dashboard-grid ${index === 0 ? "bookshelf-grid" : ""}`}>
        {section.items.map((item) => <button key={item.title} className={`feature-button feature-${item.color}`} onClick={() => setSelected(item.title)}>
          <span className="feature-icon"><Icon type={item.icon} /></span>
          <span className="feature-copy"><strong>{item.title}</strong><span>{item.description}</span></span>
          <span className="feature-arrow" aria-hidden="true">↗</span>
        </button>)}
      </div>
    </section>)}
  </>;
}
