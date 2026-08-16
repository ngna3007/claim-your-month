"use client";

import { useEffect, useRef, useState } from "react";

// TODO: swap this placeholder for the real CodeCatalyst registration URL.
const REGISTRATION_URL = "#registration-link-placeholder";
const GIFT_FILENAME = "claude-pro-giftcode.txt";

// The bytes of the downloaded file — this is the reveal. Nothing on screen
// gives it away; the lesson lands when the participant opens the file.
function giftFileContents(): string {
  return `==============================
       CLAUDE PRO GIFT CODE
          1 MONTH FREE
==============================

Gift code: CPRO-8K7M-2Q4P

Wait... that isn't a real code.

Yep, you just got phished by CodeCatalyst. 🎣

You scanned a QR code for a free gift and
downloaded a file from it. A real scam can
use the same trick to put something harmful
on your device.

You're safe here. This file is only text.
We didn't collect any personal info. We only
kept anonymous scan and click counts.

This was CodeCatalyst's friendly welcome
surprise for the workshop. The lesson showed
up as soon as you opened the file.

Want to join the workshop?
${REGISTRATION_URL}

See you there!
CodeCatalyst
`;
}

export default function ClaimPage() {
  const [stage, setStage] = useState<"promo" | "complete">("promo");
  const scanReported = useRef(false);

  // Record the scan once when the page loads.
  useEffect(() => {
    if (scanReported.current) return;
    scanReported.current = true;
    void fetch("/api/scan", { method: "POST" }).catch(() => {});
  }, []);

  function handleClaim() {
    void fetch("/api/phished", { method: "POST" }).catch(() => {});
    setStage("complete");
  }

  return (
    <main className="stage">
      <Promo onClaim={handleClaim} />
      {stage === "complete" && <CompleteOverlay />}
    </main>
  );
}

function Brand() {
  return (
    <span className="brand" style={{ color: "var(--navy)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/coca-logo.png" alt="CodeCatalyst" width={34} height={28} />
      CodeCatalyst
    </span>
  );
}

function Promo({ onClaim }: { onClaim: () => void }) {
  return (
    <section className="card promo">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Brand />
        <span className="badge">
          <CheckIcon />
          One of 50
        </span>
      </div>

      <h1 className="promo__head">You get one month of Claude Pro.</h1>
      <p className="promo__sub">
        CodeCatalyst is giving it away for free. Tap below to get your gift code.
      </p>

      <dl className="gift">
        <div>
          <dt>Your gift</dt>
          <dd>1 month of Claude Pro</dd>
        </div>
        <div className="gift__val">
          <dt>Cost</dt>
          <dd className="gift__price">
            <span className="gift__strike">$20</span>$0
          </dd>
        </div>
      </dl>

      <button className="btn" onClick={onClaim}>Get my code</button>
      <p className="fine">For K-8 students. Limited to 50 gifts.</p>
    </section>
  );
}

function CompleteOverlay() {
  const [downloaded, setDownloaded] = useState(false);

  function download() {
    const blob = new Blob([giftFileContents()], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = GIFT_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setDownloaded(true);
  }

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="claim-complete-title">
      <Confetti />
      <section className="card modal">
        <span className="badge badge--ok">
          <CheckIcon />
          Gift ready
        </span>

        <h1 id="claim-complete-title" className="modal__head">Your gift code is ready.</h1>
        <p className="modal__sub">
          It&apos;s in this text file. Download the file, then open it to find your code.
        </p>

        <button type="button" className="file" onClick={download}>
          <span className="file__icon"><FileIcon /></span>
          <span className="file__meta">
            <span className="file__name">{GIFT_FILENAME}</span>
            <span className="file__size">~1 KB · text file</span>
          </span>
          <span className="file__dl"><DownloadIcon /></span>
        </button>

        {downloaded ? (
          <p className="modal__hint">
            <CheckIcon />
            <span>Downloaded! Open <b>{GIFT_FILENAME}</b> to find your code.</span>
          </p>
        ) : (
          <p className="fine">Tip: open the file in any text app.</p>
        )}
      </section>
    </div>
  );
}

/* ---------- Confetti: hand-rolled canvas, CodeCatalyst palette only ---------- */

function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    function resize() {
      width = canvas!.clientWidth;
      height = canvas!.clientHeight;
      canvas!.width = width * dpr;
      canvas!.height = height * dpr;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize);

    const colors = ["#243d71", "#494996", "#32aab2", "#4fd1da", "#ffffff"];
    const originX = width / 2;
    const originY = height * 0.4;
    const particles = Array.from({ length: 140 }, (_, i) => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * (Math.PI * 0.95);
      const speed = 6 + Math.random() * 9;
      return {
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed * (0.6 + Math.random() * 0.8),
        vy: Math.sin(angle) * speed - Math.random() * 3,
        w: 6 + Math.random() * 6,
        h: 8 + Math.random() * 8,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 0.3,
        color: colors[i % colors.length],
        life: 0,
      };
    });

    const gravity = 0.28;
    const drag = 0.992;
    const maxLife = 150;
    let frame = 0;
    let raf = 0;

    function tick() {
      frame += 1;
      ctx!.clearRect(0, 0, width, height);
      let alive = false;
      for (const p of particles) {
        p.life += 1;
        p.vx *= drag;
        p.vy = p.vy * drag + gravity;
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vr;
        const fade = Math.max(0, 1 - p.life / maxLife);
        if (fade <= 0 || p.y > height + 40) continue;
        alive = true;
        ctx!.save();
        ctx!.globalAlpha = fade;
        ctx!.translate(p.x, p.y);
        ctx!.rotate(p.rot);
        ctx!.fillStyle = p.color;
        ctx!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx!.restore();
      }
      if (alive && frame < 420) {
        raf = requestAnimationFrame(tick);
      } else {
        ctx!.clearRect(0, 0, width, height);
      }
    }
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />;
}

/* ---------- Icons: one set, consistent stroke ---------- */

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </svg>
  );
}
