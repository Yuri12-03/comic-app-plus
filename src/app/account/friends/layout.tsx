import Link from "next/link";
export default function FriendsLayout({children}:{children:React.ReactNode}) { return <div className="site"><header className="dashboard-header"><Link className="brand" href="/account">▥ まんがのわ</Link><Link href="/account">ホームへ</Link></header><main className="profile-shell">{children}</main></div>; }
