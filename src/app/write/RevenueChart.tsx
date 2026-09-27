"use client";

// Revenue per day as thin columns. Hover or keyboard-focus a column for the exact numbers;
// "Show as table" lists every day (so no value is only reachable by hovering).

import { useEffect, useRef, useState } from "react";

type Day = { day: string; cents: number; sales: number };

const HEIGHT = 220; // plot area
const AXIS = 28; // x-axis label band (included in the card height)
const LEFT = 44; // y-axis labels
const COLOR = "#0071e3"; // Apple blue, validated for contrast on white

const eur = (cents: number) => `€${(cents / 100).toFixed(2)}`;
const shortDate = (day: string) =>
  new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

// Clean tick steps: 0, €0.50, €1.00 …
function niceMax(max: number) {
  const steps = [10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 5000];
  const step = steps.find((s) => max / s <= 4) ?? 10000;
  return { top: Math.max(step, Math.ceil(max / step) * step), step };
}

export default function RevenueChart({ days }: { days: Day[] }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);

  // Measure the available width so bars keep their shape on every screen.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  const max = Math.max(...days.map((d) => d.cents), 1);
  const { top, step } = niceMax(max);
  const plotWidth = Math.max(width - LEFT, 0);
  const band = plotWidth / days.length;
  const barWidth = Math.max(2, Math.min(24, band - 2)); // ≤ 24px, 2px gap between bars
  const y = (cents: number) => HEIGHT - (cents / top) * HEIGHT;
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  const labelEvery = Math.ceil(days.length / 6);

  const total = days.reduce((sum, d) => sum + d.cents, 0);
  const activeDay = active !== null ? days[active] : null;

  return (
    <figure className="rounded-xl bg-white p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <figcaption>
          <p className="type-sub font-semibold">Revenue per day</p>
          <p className="type-caption mt-1 text-black/60">
            {eur(total)} in the last {days.length} days
          </p>
        </figcaption>
        <button onClick={() => setShowTable(!showTable)} className="type-caption text-apple-link hover:underline">
          {showTable ? "Show as chart" : "Show as table"}
        </button>
      </div>

      {showTable ? (
        <div className="mt-6 max-h-[320px] overflow-y-auto">
          <table className="type-caption w-full text-left tabular-nums">
            <thead className="sticky top-0 bg-white text-black/50">
              <tr>
                <th className="py-2 font-normal">Day</th>
                <th className="py-2 text-right font-normal">Sales</th>
                <th className="py-2 text-right font-normal">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {[...days].reverse().map((d) => (
                <tr key={d.day}>
                  <td className="py-1.5">{shortDate(d.day)}</td>
                  <td className="py-1.5 text-right">{d.sales}</td>
                  <td className="py-1.5 text-right">{eur(d.cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={boxRef} className="relative mt-6" style={{ height: HEIGHT + AXIS }}>
          {width > 0 && (
            <svg width={width} height={HEIGHT + AXIS} role="img" aria-label={`Revenue per day, total ${eur(total)}`}>
              {/* Gridlines + y-axis labels (hairline, recessive) */}
              {ticks.map((t) => (
                <g key={t}>
                  <line x1={LEFT} x2={width} y1={y(t)} y2={y(t)} stroke={t === 0 ? "#c3c2b7" : "#ecebe6"} />
                  <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#898781" className="tabular-nums">
                    {eur(t)}
                  </text>
                </g>
              ))}

              {days.map((d, i) => {
                const x = LEFT + i * band + (band - barWidth) / 2;
                const h = HEIGHT - y(d.cents);
                const r = Math.min(4, h / 2, barWidth / 2);
                return (
                  <g key={d.day}>
                    {/* Column: rounded top, square at the baseline */}
                    {h > 0 && (
                      <path
                        d={`M${x},${HEIGHT} V${HEIGHT - h + r} Q${x},${HEIGHT - h} ${x + r},${HEIGHT - h} H${x + barWidth - r} Q${x + barWidth},${HEIGHT - h} ${x + barWidth},${HEIGHT - h + r} V${HEIGHT} Z`}
                        fill={COLOR}
                        opacity={active === null || active === i ? 1 : 0.45}
                      />
                    )}
                    {/* Hit area: the whole column band, bigger than the bar */}
                    <rect
                      x={LEFT + i * band}
                      y={0}
                      width={band}
                      height={HEIGHT}
                      fill="transparent"
                      tabIndex={0}
                      aria-label={`${shortDate(d.day)}: ${eur(d.cents)}, ${d.sales} sales`}
                      onPointerEnter={() => setActive(i)}
                      onPointerLeave={() => setActive(null)}
                      onFocus={() => setActive(i)}
                      onBlur={() => setActive(null)}
                      style={{ outline: "none" }}
                    />
                    {i % labelEvery === 0 && (
                      <text x={LEFT + i * band + band / 2} y={HEIGHT + 18} textAnchor="middle" fontSize="11" fill="#898781">
                        {shortDate(d.day)}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          )}

          {/* Tooltip: value first, then the details */}
          {activeDay && active !== null && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg bg-white px-3 py-2 shadow-[3px_5px_30px_rgba(0,0,0,0.22)]"
              style={{
                left: Math.min(Math.max(LEFT + active * band + band / 2, 70), width - 70),
                top: Math.max(y(activeDay.cents) - 64, 0),
              }}
            >
              <p className="text-[15px] font-semibold tabular-nums text-apple-ink">{eur(activeDay.cents)}</p>
              <p className="type-micro whitespace-nowrap text-black/60">
                {activeDay.sales} {activeDay.sales === 1 ? "sale" : "sales"} · {shortDate(activeDay.day)}
              </p>
            </div>
          )}
        </div>
      )}
    </figure>
  );
}
