import type { Metadata } from "next";
import { Orbitron, Manrope, Geist_Mono } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "700", "900"],
  display: "swap",
});
const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});
const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Claim your free Claude Pro — CodeCatalyst",
  description: "CodeCatalyst is giving 50 students one month of Claude Pro, free.",
  icons: { icon: "/coca-logo.png" },
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${manrope.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
