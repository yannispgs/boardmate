import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import { SimulationBanner } from "@/components/SimulationBanner";
import { getMyPermissions } from "@/lib/auth/permissions";
import { getCurrentUser } from "@/lib/auth/session";
import { appleStartupImages } from "@/lib/pwa/assets";
import pkg from "../../package.json";
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

// Short commit hash of the deployed build, when running on Vercel.
const build = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7);
const version = build ? `v${pkg.version} · ${build}` : `v${pkg.version}`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [user, permissions] = await Promise.all([
    getCurrentUser(),
    getMyPermissions(),
  ]);

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Above everything, on every screen: a narrowed view has to be
            visible from wherever it is being read, not only from the page
            that started it. It draws nothing when nothing is simulated. */}
        <SimulationBanner />
        {children}
        {user ? (
          <BottomNav
            email={user.email ?? ""}
            canAdmin={permissions.includes("roles.read")}
            version={version}
          />
        ) : null}
      </body>
    </html>
  );
}
