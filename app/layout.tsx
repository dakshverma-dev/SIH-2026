import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReviewStoreProvider } from "@/lib/store/review-store";
import { NavBar } from "@/components/shared/NavBar";
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
  title: "Plan2Reality",
  description: "Schedule matching pipeline prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-[#F5F4F0]`}
    >
      <body className="min-h-full flex flex-col">
        <NavBar />
        <ReviewStoreProvider>{children}</ReviewStoreProvider>
      </body>
    </html>
  );
}
