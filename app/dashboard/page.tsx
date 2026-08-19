"use client";

import { useEffect, useState } from "react";
import { phishRatePercent } from "@/lib/stats-display";

type Bucket = { t: number; count: number };
type Stats = { scans: number; phished: number; phishRate: number; series: Bucket[] };

const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
function fmtTime(ms: number) {
  return timeFmt.format(new Date(ms));
}

export default function Dashboard() {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch("/api/stats", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => { if (alive && typeof d.scans === "number") setS(d); })
        .catch(() => {});
    load();
    const id = setInterval(load, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!s) return <main className="stage"><p className="dash__loading">Loading…</p></main>;
  const rate = phishRatePercent(s.phished, s.scans);
  return (
    <main className="dash">
      <header className="dash__head">
        <h1>CodeCatalyst — live phish tally</h1>
        <p>Anonymous engagement. No personal data is collected.</p>
      </header>
      <div className="tiles tiles--dash">
        <Tile label="Scans" value={s.scans} />
        <Tile label="Phished" value={s.phished} />
        <Tile label="Fell for it" value={`${rate}%`} />
      </div>
      <TimeChart series={s.series} />
    </main>
  );
}

/* ---------- Stat tile: body font, tabular-nums (never the display face) ---------- */

function Tile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="tile">
      <span className="tile__value">{value}</span>
      <span className="tile__label">{label}</span>
    </div>
  );
}

/* ============================================================
   Time chart — phished events per 15-minute window
   Inline SVG, single teal hue (one series → no categorical
   palette needed). Rounded 4px data-end, 2px bar gap, faint
   recessive grid, latest bar emphasized, only the latest bar
   direct-labeled, first/last time ticks only, per-bar hover
   tooltip with a hit target wider than the bar.
   ============================================================ */

const BAR_W = 18; // ≤24px per the mark spec
const GAP = 2; // surface gap between adjacent bars
const STEP = BAR_W + GAP;
const PAD_X = 14; // side padding — keeps edge ticks/labels from clipping
const TOP_PAD = 26; // room for the direct value label above the tallest bar
const PLOT_H = 128;
const AXIS_H = 22; // room for the first/last time tick
const RADIUS = 4;

// Must match .chart__scroll's padding in globals.css. The tooltip is
// positioned against .chart (zero padding, unclipped), while the SVG lives
// inside .chart__scroll (the padded, overflow-x:auto element) — so raw
// SVG-local coordinates need this offset added back in to line up.
const CHART_PAD_LEFT = 16;
const CHART_PAD_TOP = 20;

// Rounded top, square baseline — a path (not a plain rect) so only the
// data-end rounds, per the mark spec ("square at the baseline").
function barPath(x: number, y: number, w: number, h: number): string {
  if (h <= 0) return "";
  const r = Math.min(RADIUS, h, w / 2);
  if (r <= 0.5) return `M${x},${y} H${x + w} V${y + h} H${x} Z`;
  return [
    `M${x},${y + r}`,
    `A${r},${r} 0 0 1 ${x + r},${y}`,
    `H${x + w - r}`,
    `A${r},${r} 0 0 1 ${x + w},${y + r}`,
    `V${y + h}`,
    `H${x}`,
    `Z`,
  ].join(" ");
}

function TimeChart({ series }: { series: Bucket[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [scrollLeft, setScrollLeft] = useState(0);

  if (series.length === 0) {
    return (
      <div className="chart">
        <p className="chart__empty">No phishing activity yet — the chart fills in as people scan and get phished.</p>
      </div>
    );
  }

  const max = Math.max(1, ...series.map((d) => d.count));
  const baseline = TOP_PAD + PLOT_H;
  const width = series.length * STEP - GAP + PAD_X * 2;
  const height = TOP_PAD + PLOT_H + AXIS_H;
  const lastIndex = series.length - 1;

  const bars = series.map((d, i) => {
    const x = PAD_X + i * STEP;
    const h = d.count > 0 ? Math.max(3, (d.count / max) * PLOT_H) : 0;
    return { t: d.t, count: d.count, x, y: baseline - h, h, cx: x + BAR_W / 2 };
  });
  const latest = bars[lastIndex];

  return (
    <div className="chart">
      {/* .chart itself is the tooltip's positioning context: zero padding, overflow
          visible, so it never clips the tooltip. Scrolling + padding live one level
          down, on .chart__scroll, which wraps only the SVG. */}
      <div className="chart__scroll" onScroll={(e) => setScrollLeft(e.currentTarget.scrollLeft)}>
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label="Phished events by 15-minute window"
        >
          {/* faint recessive grid */}
          <line className="chart__grid" x1={0} x2={width} y1={TOP_PAD} y2={TOP_PAD} />
          <line className="chart__grid" x1={0} x2={width} y1={TOP_PAD + PLOT_H / 2} y2={TOP_PAD + PLOT_H / 2} />
          <line className="chart__baseline" x1={0} x2={width} y1={baseline} y2={baseline} />

          {bars.map((b, i) => {
            const emphasized = i === lastIndex || i === hover;
            return (
              <g key={b.t}>
                {b.h > 0 && (
                  <path className="chart__bar" d={barPath(b.x, b.y, BAR_W, b.h)} fill={emphasized ? "var(--teal-bright)" : "var(--teal)"} />
                )}
                {/* hit target: full column height, wider than the bar itself */}
                <rect
                  className="chart__hit"
                  x={b.x - GAP / 2}
                  y={TOP_PAD}
                  width={STEP}
                  height={PLOT_H}
                  tabIndex={0}
                  aria-label={`${fmtTime(b.t)}: ${b.count} phished`}
                  onMouseEnter={() => setHover(i)}
                  onMouseLeave={() => setHover((h) => (h === i ? null : h))}
                  onFocus={() => setHover(i)}
                  onBlur={() => setHover((h) => (h === i ? null : h))}
                />
              </g>
            );
          })}

          {/* direct label: latest bar only */}
          <text className="chart__value-label" x={latest.cx} y={Math.max(12, latest.y - 8)} textAnchor="middle">
            {latest.count}
          </text>

          {/* axis: first + last time only, never one per bar */}
          <text className="chart__tick" x={PAD_X} y={baseline + 16} textAnchor="start">
            {fmtTime(bars[0].t)}
          </text>
          {series.length > 1 && (
            <text className="chart__tick" x={width - PAD_X} y={baseline + 16} textAnchor="end">
              {fmtTime(bars[lastIndex].t)}
            </text>
          )}
        </svg>
      </div>

      {hover !== null && (
        <div
          className="chart__tooltip"
          style={{
            left: CHART_PAD_LEFT + bars[hover].cx - scrollLeft,
            top: CHART_PAD_TOP + Math.max(0, bars[hover].y - 8),
          }}
        >
          <strong>{bars[hover].count} phished</strong>
          <span>{fmtTime(bars[hover].t)}</span>
        </div>
      )}
    </div>
  );
}
