import type { Metadata } from "next";
import { headers } from "next/headers";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Free Claude Pro",
  description: "50 free months of Claude Pro. Scan the QR code to claim yours.",
};

async function getClaimUrl(): Promise<string> {
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return `${envBase.replace(/\/$/, "")}/claim`;
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}/claim`;
}

export default async function PosterPage() {
  const claimUrl = await getClaimUrl();
  const qr = await QRCode.toDataURL(claimUrl, {
    width: 560,
    margin: 0,
    color: { dark: "#18181b", light: "#ffffff" },
  });

  return (
    <main className="stage stage--lure">
      <section className="card flyer">
        <span className="badge">First 50 students</span>
        <h1 className="flyer__head">Get Claude Pro free for a month</h1>
        <p className="flyer__sub">50 months to give away. Scan the QR code to claim yours.</p>

        <div className="flyer__qr">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`QR code linking to ${claimUrl}`} width={560} height={560} />
        </div>

        <span className="flyer__scan">
          <ScanIcon />
          Scan this QR code
        </span>

        <p className="flyer__url">{claimUrl}</p>
      </section>
    </main>
  );
}

function ScanIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V6a2 2 0 0 1 2-2h2" />
      <path d="M16 4h2a2 2 0 0 1 2 2v2" />
      <path d="M20 16v2a2 2 0 0 1-2 2h-2" />
      <path d="M8 20H6a2 2 0 0 1-2-2v-2" />
      <path d="M4 12h16" />
    </svg>
  );
}
