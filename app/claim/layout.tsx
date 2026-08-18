import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Claim your free Claude Pro",
  description: "Tell us where to send your free month of Claude Pro.",
};

export default function ClaimLayout({ children }: { children: React.ReactNode }) {
  return children;
}
