import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://stellar.brightening.ca"),
  title: "Retro Stellar Astronomy",
  description:
    "A retro mission-control observatory for the night sky over Calgary — live aurora forecasts, cloud conditions, visible planets, ISS passes, and near-Earth asteroids at a glance.",
  appleWebApp: {
    capable: true,
    title: "Observatory",
    statusBarStyle: "black-translucent",
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "Retro Stellar Astronomy",
    description:
      "Live aurora, sky conditions, planets, ISS passes, and near-Earth asteroids — a retro mission-control observatory for Calgary skies.",
    url: "https://stellar.brightening.ca/tonight",
    siteName: "Retro Stellar Astronomy",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Retro Stellar Astronomy",
    description:
      "Live aurora, sky conditions, planets, ISS passes, and near-Earth asteroids — a retro mission-control observatory for Calgary skies.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
