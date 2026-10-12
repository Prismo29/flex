import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/Header";
import RegisterSW from "@/components/RegisterSW";
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
  title: "FLEX — Put your money where your rank is",
  description: "The social network where the leaderboard is ranked by how much you spend.",
  appleWebApp: { capable: true, title: "FLEX", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#0b0b0d",
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
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-dvh`}>
        <Header />
        {/* pb leaves room for the mobile bottom nav */}
        <main className="mx-auto w-full max-w-2xl px-4 pt-4 pb-28 md:pb-12">{children}</main>
        <RegisterSW />
      </body>
    </html>
  );
}
