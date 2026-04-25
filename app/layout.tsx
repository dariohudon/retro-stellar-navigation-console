import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Retro Stellar Navigation Console",
  description: "Tactical solar system navigation — Sol system survey map",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
