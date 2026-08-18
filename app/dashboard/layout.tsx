import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Live phish tally - CodeCatalyst",
  description: "Anonymous engagement for the CodeCatalyst welcome game. No personal data is collected.",
  icons: { icon: "/coca-logo.png" },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
