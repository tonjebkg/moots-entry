// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { DM_Sans, Playfair_Display } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--font-playfair" });

export const metadata: Metadata = {
  title: "Moots — Where meaningful encounters begin",
  description:
    "A private experience layer for gatherings where who meets matters. Designed for brands and communities who curate with intention.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.className} ${dmSans.variable} ${playfair.variable}`}>{children}</body>
    </html>
  );
}
