import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "まんがのわ | 漫画の本棚と貸し借り",
  description: "漫画を整理して、友達やグループと共有する本棚アプリ。",
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
