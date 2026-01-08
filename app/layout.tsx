// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const mono = Roboto_Mono({ subsets: ["latin"] });

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
      {/* If you later want mono somewhere, add mono.className to a wrapper */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}
