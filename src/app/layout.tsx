import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "まんがのわ | 漫画の本棚と貸し借り",
  description: "漫画の登録・本棚管理・友達の本棚の閲覧ができるアプリ。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
