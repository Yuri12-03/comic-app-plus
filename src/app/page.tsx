import Link from "next/link";
export default function Home() {
  return <div className="site">
    <header><Link className="brand" href="/">▥ まんがのわ</Link><Link href="/login">ログイン →</Link></header>
    <main><section className="hero">
      <div><h1>漫画管理</h1><div className="actions"><Link className="button" href="/signup">新規登録</Link><Link href="/login">ログイン</Link></div></div>
      <div className="shelf" role="img" aria-label="漫画が並ぶ本棚のイラスト"><div className="books">{Array.from({length:5},(_,i)=><div className={`book book-${i}`} key={i}><span>0{i+1}</span></div>)}</div><div className="shelf-line" /></div>
    </section></main>
  </div>;
}
