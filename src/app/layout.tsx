import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { appleStartupImages } from "@/lib/pwa/assets";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Boardmate",
  description: "Outils pour vos soirées jeux de société",
  appleWebApp: {
    capable: true,
    title: "Boardmate",
    statusBarStyle: "black-translucent",
    // Without these, an iPhone launching the installed application shows a
    // white screen until the first paint — a couple of seconds of nothing, all
    // of it spent on the round trip that checks the session.
    startupImage: appleStartupImages(),
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
