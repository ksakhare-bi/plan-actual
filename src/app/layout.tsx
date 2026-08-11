import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Plan vs Actual Tracker",
  description: "Set monthly spending targets, log actuals, and review variance with locked periods.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${plusJakarta.variable} ${geistMono.variable}`}>
      <body className="min-h-screen bg-slate-50/50 text-slate-900 font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
