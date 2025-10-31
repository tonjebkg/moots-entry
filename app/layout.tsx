// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });
const mono = Roboto_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Moots Entry",
  description: "Event entry, guest list upload, check-in, and scanning",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* add `${mono.className}` if you actually use a mono font somewhere */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}
