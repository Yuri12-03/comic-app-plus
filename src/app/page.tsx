import Link from "next/link";
export default function Home() {
  return (
    <div className="site">
      <header>
        <Link className="brand" href="/">
          ▥ まんがのわ
        </Link>
        <Link href="/login">ログイン →</Link>
      </header>
      <main>
        <section className="hero">
          <div>
            <p className="eyebrow">あなたの本棚から、つながる読書。</p>
            <h1>
              好きな漫画を、
              <br />
              身近な人と。
            </h1>
            <p className="lead">
              持っている漫画も、友達に貸した一冊も。
              <br />
              本棚と貸し借りを、ひとつの場所で。
            </p>
            <div className="actions">
              <Link className="button" href="/signup">
                自分の本棚をはじめる →
              </Link>
              <Link href="/login">アカウントをお持ちの方 →</Link>
            </div>
          </div>
          <div
            className="shelf"
            role="img"
            aria-label="漫画が並ぶ本棚のイラスト"
          >
            <p>MY LITTLE BOOKSHELF</p>
            <div className="books">
              {[
                "冒険の日々",
                "いつもの街",
                "青い季節",
                "星をめぐる",
                "放課後日和",
              ].map((name, i) => (
                <div className={`book book-${i}`} key={name}>
                  {name}
                  <span>0{i + 1}</span>
                </div>
              ))}
            </div>
            <div className="shelf-line" />
            <p>一冊の「好き」を、分かち合おう。</p>
          </div>
        </section>
        <section className="features">
          {[
            [
              "01 / BOOKSHELF",
              "自分だけの本棚",
              "持っている漫画をまとめて、読みたい一冊を見つけやすく。",
            ],
            [
              "02 / FRIENDS",
              "友達やグループと",
              "友達、サークル、研究室。身近な人の本棚から、新しい出会いを。",
            ],
            [
              "03 / SHARING",
              "貸し借りを忘れずに",
              "借りたい漫画の申請から返却まで、状況をわかりやすく。",
            ],
          ].map(([number, title, text]) => (
            <div key={number}>
              <small>{number}</small>
              <h2>{title}</h2>
              <p>{text}</p>
            </div>
          ))}
        </section>
        <p className="help">
          ただいま開発中です。まずは登録・ログインから。本棚や貸出機能は順次追加します。
        </p>
      </main>
      <footer>まんがのわ — 本棚から広がる、漫画のつながり。</footer>
    </div>
  );
}
