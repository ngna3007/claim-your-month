"use client";

import { useEffect, useRef, useState } from "react";
import { readReveal, writeReveal } from "@/lib/reveal-store";
import { joinLabel, joinUrl, merch } from "@/lib/site";

type Stats = { rank: number; scans: number; phished: number };

export default function ClaimPage() {
  const [ready, setReady] = useState(false);
  const [result, setResult] = useState<Stats | null>(null);
  const scanReported = useRef(false);

  useEffect(() => {
    const stored = readReveal();
    if (stored) {
      setResult(stored);
      void fetch("/api/stats")
        .then((r) => r.json())
        .then((s: { scans?: number; phished?: number }) => {
          setResult((prev) =>
            prev
              ? { ...prev, scans: Number(s.scans) || prev.scans, phished: Number(s.phished) || prev.phished }
              : prev,
          );
        })
        .catch(() => {});
    } else if (!scanReported.current) {
      scanReported.current = true;
      void fetch("/api/scan", { method: "POST" }).catch(() => {});
    }
    setReady(true);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Ethics: the typed values are never read or sent. Empty POST only.
    let data: Stats = { rank: 0, scans: 0, phished: 0 };
    try {
      const res = await fetch("/api/phished", { method: "POST" });
      data = await res.json();
    } catch {
      /* offline: still reveal, with a zeroed rank */
    }
    writeReveal(data);
    setResult(data);
  }

  useEffect(() => {
    if (!result) return;
    const previous = document.title;
    document.title = "You just got phished - CodeCatalyst";
    return () => {
      document.title = previous;
    };
  }, [result]);

  if (!ready) return <main className="stage stage--lure" />;

  return (
    <main className={result ? "stage" : "stage stage--lure"}>
      {result ? <Reveal stats={result} /> : <BaitForm onSubmit={handleSubmit} />}
    </main>
  );
}

function BaitForm({ onSubmit }: { onSubmit: (e: React.FormEvent) => void }) {
  return (
    <section className="card promo">
      <h1 className="promo__head">Get Claude Pro free for a month.</h1>
      <p className="promo__sub">Tell us where to send it and it&apos;s yours.</p>
      <form className="form" onSubmit={onSubmit}>
        <label className="field">
          <span>Full name</span>
          <input type="text" autoComplete="off" placeholder="Alex Nguyen" />
        </label>
        <label className="field">
          <span>Email</span>
          <input type="email" autoComplete="off" placeholder="alex@school.edu" />
        </label>
        <button className="btn" type="submit">Claim my free month</button>
      </form>
      <p className="fine">Limited to 50 gifts. Students only.</p>
    </section>
  );
}

function Reveal({ stats }: { stats: Stats }) {
  const n = useCountUp(stats.rank);
  const rate = stats.scans > 0 ? Math.min(100, Math.round((stats.phished / stats.scans) * 100)) : 0;
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="reveal-title">
      <Confetti />
      <section className="card reveal">
        <Brand />
        <span className="badge badge--ok"><CheckIcon /> Gotcha</span>
        <h1 id="reveal-title" className="reveal__head">You just got phished.</h1>
        <p className="reveal__turn">Don&apos;t worry — it&apos;s a game, and you&apos;re in good company.</p>

        <p className="bignum">You&apos;re the <b>#{n}</b> person to be phished</p>

        <div className="tiles">
          <Tile label="Scanned the QR" value={stats.scans} />
          <Tile label="Got phished" value={stats.phished} />
          <Tile label="Fell for it" value={`${rate}%`} />
        </div>
        <Bar phished={stats.phished} scans={stats.scans} />

        <div className="insight">
          <BulbIcon />
          <p><b>What is phishing?</b> A fake offer that tricks you into handing over your
          info. This one looked official and free — that&apos;s the trick. Always check
          who&apos;s really asking before you type anything.</p>
        </div>

        <p className="reassure">We didn&apos;t save your name or email. Promise.</p>
        {merch ? <p className="merch">{merch}</p> : null}
        {joinUrl ? (
          <a className="btn btn--teal" href={joinUrl} target="_blank" rel="noopener noreferrer">
            {joinLabel}
          </a>
        ) : null}
      </section>
    </div>
  );
}

/* ---------- Reveal helpers ---------- */

function useCountUp(target: number, duration = 900): number {
  const [value, setValue] = useState(() => {
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return target;
    }
    return 0;
  });

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);

  return value;
}

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="tile">
      <span className="tile__value">{value}</span>
      <span className="tile__label">{label}</span>
    </div>
  );
}

function Bar({ phished, scans }: { phished: number; scans: number }) {
  const raw = scans > 0 ? (phished / scans) * 100 : 0;
  const target = Math.min(100, Math.max(6, raw));
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setWidth(target);
      return;
    }
    const raf = requestAnimationFrame(() => setWidth(target));
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return (
    <div className="bar" role="img" aria-label={`${phished} of ${scans} scans got phished`}>
      <div className="bar__fill" style={{ width: `${width}%` }} />
    </div>
  );
}

function BulbIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M10 21h4" />
      <path d="M9.5 15.5 9.4 14a2.6 2.6 0 0 0-1.02-1.94 6 6 0 1 1 7.24 0A2.6 2.6 0 0 0 14.6 14l-.1 1.5Z" />
      <path d="M12 6v2.2" />
    </svg>
  );
}

/* ---------- Brand lockup ---------- */

function Brand() {
  return (
    <span className="brand" style={{ color: "var(--navy)" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/coca-logo.png" alt="CodeCatalyst" width={34} height={28} />
      CodeCatalyst
    </span>
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
