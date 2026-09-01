import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Plan2Reality — Trusted Execution Intelligence",
  description: "Field reality → verified schedule truth → project impact → recovery decision.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
