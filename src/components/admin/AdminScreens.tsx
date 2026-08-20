"use client";

import { useEffect, useState } from "react";
import { COURTS, FEED, HOURS, OCC_CURVE, occStats, TYPE_LABEL, WEEK } from "@/lib/data";
import { emptyGrid, fetchOccupancyGrid, toIsoDate } from "@/lib/api";
import type { TFunction } from "@/lib/i18n";
import type { Lang, SlotCell } from "@/lib/types";
import { Avatar, Badge, CourtDiagram, Legend, Segmented } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import { OccupancyGrid } from "@/components/OccupancyGrid";

function RevenueChart({ data }: { data: typeof WEEK }) {
  const max = Math.max(...data.map((d) => d.court + d.gear));
  const W = 100 / data.length;
  return (
    <svg viewBox="0 0 100 56" preserveAspectRatio="none" style={{ width: "100%", height: 180, overflow: "visible" }}>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2="100" y1={48 - g * 44} y2={48 - g * 44} stroke="var(--line)" strokeWidth="0.3" />
      ))}
      {data.map((d, i) => {
        const x = i * W + W * 0.28;
        const bw = W * 0.44;
        const ch = (d.court / max) * 44;
        const gh = (d.gear / max) * 44;
        return (
          <g key={d.d}>
            <rect x={x} y={48 - ch} width={bw} height={ch} rx="1" fill="var(--accent)" opacity="0.92" />
            <rect x={x} y={48 - ch - gh} width={bw} height={gh} rx="1" fill="var(--ink-3)" opacity="0.55" />
            <text x={i * W + W / 2} y="54.5" fontSize="3.4" fill="var(--ink-faint)" textAnchor="middle" fontFamily="var(--font-ui)">
              {d.d}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function OccCurve({ data, hours }: { data: number[]; hours: string[] }) {
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${48 - (v / 100) * 44}`);
  const area = `0,48 ${pts.join(" ")} 100,48`;
  return (
    <svg viewBox="0 0 100 56" preserveAspectRatio="none" style={{ width: "100%", height: 180, overflow: "visible" }}>
      <defs>
        <linearGradient id="occg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent)" stopOpacity="0.34" />
          <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2="100" y1={48 - g * 44} y2={48 - g * 44} stroke="var(--line)" strokeWidth="0.3" />
      ))}
      <polygon points={area} fill="url(#occg)" />
      <polyline points={pts.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1" strokeLinejoin="round" />
      {data.map((v, i) => (
        <circle key={i} cx={(i / (data.length - 1)) * 100} cy={48 - (v / 100) * 44} r="0.9" fill="var(--accent)" />
      ))}
      {hours.map((h, i) =>
        i % 2 === 0 ? (
          <text key={h} x={(i / (data.length - 1)) * 100} y="54.5" fontSize="3.2" fill="var(--ink-faint)" textAnchor="middle" fontFamily="var(--font-mono)">
            {h}
          </text>
        ) : null
      )}
    </svg>
  );
}

function AdminStat({
  label,
  value,
  sub,
  delta,
  up,
  icon,
}: {
  label: string;
  value: string;
  sub: string;
  delta?: string;
  up?: boolean;
  icon: "euro" | "chart" | "today" | "gear";
}) {
  return (
    <div className="card" style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="eyebrow" style={{ fontSize: 10 }}>
          {label}
        </span>
        <Icon name={icon} size={16} style={{ color: "var(--accent)" }} />
      </div>
      <div className="display" style={{ fontSize: 32, lineHeight: 1 }}>
        {value}
      </div>
      <div className="row gap-2" style={{ fontSize: 12.5 }}>
        {delta && (
          <span className="row gap-1" style={{ color: up ? "var(--free)" : "var(--busy)", fontWeight: 600 }}>
            <Icon name="arrowUp" size={13} style={{ transform: up ? "none" : "rotate(180deg)" }} />
            {delta}
          </span>
        )}
        <span className="muted">{sub}</span>
      </div>
    </div>
  );
}

export function AdminOverview({ t }: { t: TFunction }) {
  const st = occStats();
  const weekTotal = WEEK.reduce((s, d) => s + d.court + d.gear, 0);

  return (
    <div className="view-in col gap-6" style={{ padding: "var(--page-pad)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Admin · Clubhaus
          </div>
          <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)", margin: 0 }}>
            {t("overview")}
          </h1>
        </div>
        <Badge tone="free" soft>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--free)" }} />
          Live · Do 5. Juni
        </Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))", gap: 14 }}>
        <AdminStat label={`${t("revenue")} · ${t("today")}`} value="1.460 €" delta="+12%" up sub="vs. gestern" icon="euro" />
        <AdminStat label={t("utilisation")} value={`${st.pct}%`} delta="+6%" up sub={`${st.booked}/${st.total} Slots`} icon="chart" />
        <AdminStat label={t("bookedToday")} value="48" delta="+9" up sub={t("courts")} icon="today" />
        <AdminStat label={t("gearRevenue")} value="268 €" delta="+18%" up sub="42 Leihen" icon="gear" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 16 }} className="admin-charts">
        <div className="card" style={{ padding: 22 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
            <div>
              <h3 className="display" style={{ fontSize: 20, margin: 0 }}>
                {t("revenue")}
              </h3>
              <span className="muted" style={{ fontSize: 13 }}>
                {t("week")} · {weekTotal.toLocaleString("de-DE")} €
              </span>
            </div>
            <div className="row gap-4" style={{ fontSize: 12 }}>
              <span className="row gap-2">
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--accent)" }} />
                {t("courtRevenue")}
              </span>
              <span className="row gap-2">
                <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--ink-3)" }} />
                {t("gearRevenue")}
              </span>
            </div>
          </div>
          <RevenueChart data={WEEK} />
        </div>
        <div className="card" style={{ padding: 22 }}>
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 18 }}>
            <div>
              <h3 className="display" style={{ fontSize: 20, margin: 0 }}>
                {t("utilisation")}
              </h3>
              <span className="muted" style={{ fontSize: 13 }}>
                {t("today")} · Stoßzeit 20:00
              </span>
            </div>
          </div>
          <OccCurve data={OCC_CURVE} hours={HOURS} />
        </div>
      </div>

      <div className="card" style={{ padding: 22 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
          <div className="row gap-2">
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--free)", boxShadow: "0 0 0 4px var(--free-soft)" }} />
            <h3 className="display" style={{ fontSize: 20, margin: 0 }}>
              {t("liveFeed")}
            </h3>
          </div>
          <Badge soft>+3 / Min</Badge>
        </div>
        <div className="col">
          {FEED.map((f, i) => (
            <div key={i} className="row" style={{ gap: 14, padding: "12px 0", borderTop: i ? "1px solid var(--line)" : "none" }}>
              <Avatar initials={f.who.split(" ").map((x) => x[0]).join("")} size={34} />
              <div className="grow">
                <div style={{ fontWeight: 600, fontSize: 14 }}>{f.who}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>
                  {f.act}
                </div>
              </div>
              {f.gear && (
                <Badge tone="accent" soft style={{ fontSize: 10 }}>
                  <Icon name="gear" size={10} />
                  Leihe
                </Badge>
              )}
              <div style={{ textAlign: "right" }}>
                <div className="display" style={{ fontSize: 16 }}>
                  +{f.amt} €
                </div>
                <div className="muted" style={{ fontSize: 11 }}>
                  {f.ago}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function AdminBookings({ t, lang, token }: { t: TFunction; lang: Lang; token: string }) {
  const [free, setFree] = useState(false);
  const [grid, setGrid] = useState<Record<number, SlotCell[]>>(() => emptyGrid());
  const today = toIsoDate(new Date());

  useEffect(() => {
    let cancelled = false;
    fetchOccupancyGrid(today, token)
      .then((next) => {
        if (!cancelled) setGrid(next);
      })
      .catch(() => {
        if (!cancelled) setGrid(emptyGrid());
      });
    return () => {
      cancelled = true;
    };
  }, [today, token]);

  return (
    <div className="view-in col gap-6" style={{ padding: "var(--page-pad)" }}>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 14 }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            Admin
          </div>
          <h1 className="display" style={{ fontSize: "clamp(28px,4vw,40px)", margin: 0 }}>
            {t("manageBookings")}
          </h1>
        </div>
        <Segmented
          value={free ? "free" : "all"}
          onChange={(v) => setFree(v === "free")}
          options={[
            { value: "all", label: t("allDay") },
            { value: "free", label: t("filterFree") },
          ]}
        />
      </div>
      <div className="card" style={{ padding: "20px 20px 22px" }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontWeight: 600 }}>Belegungsplan · {today}</span>
          <div className="row gap-4" style={{ fontSize: 12, color: "var(--ink-3)" }}>
            <Legend c="var(--free)" label={t("free")} />
            <Legend c="var(--busy)" label={t("booked")} />
            <Legend c="var(--accent)" label="Club" />
          </div>
        </div>
        <OccupancyGrid t={t} lang={lang} manage filterFree={free} grid={grid} onCell={() => {}} />
        <p className="muted" style={{ fontSize: 12.5, marginTop: 14, marginBottom: 0 }}>
          Klicke eine Zelle, um eine Buchung zu bearbeiten, zu blockieren oder zu stornieren.
        </p>
      </div>
    </div>
  );
}

export function AdminCourts({ t, lang, token }: { t: TFunction; lang: Lang; token: string }) {
  const [grid, setGrid] = useState<Record<number, SlotCell[]>>(() => emptyGrid());

  useEffect(() => {
    let cancelled = false;
    fetchOccupancyGrid(toIsoDate(new Date()), token)
      .then((next) => {
        if (!cancelled) setGrid(next);
      })
      .catch(() => {
        if (!cancelled) setGrid(emptyGrid());
      });
    return () => {
      cancelled = true;
    };
  }, [token]);
  return (
    <div className="view-in col gap-6" style={{ padding: "var(--page-pad)" }}>
      <div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          Admin
        </div>
        <h1 className="display" style={{ fontSize: "clamp(28px,4vw,40px)", margin: 0 }}>
          {t("courts")}
        </h1>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 16 }}>
        {COURTS.map((c) => {
          const slots = grid[c.id] ?? [];
          const booked = slots.filter((s) => s.state !== "free").length;
          const pct = slots.length ? Math.round((booked / slots.length) * 100) : 0;
          return (
            <div key={c.id} className="card" style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <div className="row gap-2">
                  <span className="display" style={{ fontSize: 18, color: "var(--accent)" }}>
                    {c.id}
                  </span>
                  <span style={{ fontWeight: 600 }}>{c.name}</span>
                </div>
                <Badge soft>{c.price} €</Badge>
              </div>
              <CourtDiagram w={184} single={c.mode === "Einzel"} accent={pct > 60} />
              <div className="row" style={{ justifyContent: "space-between", fontSize: 12.5 }}>
                <span className="muted">
                  {TYPE_LABEL[c.type][lang]} · {c.mode}
                </span>
                <span style={{ fontWeight: 600, color: pct > 60 ? "var(--busy)" : "var(--free)" }}>
                  {pct}% {t("booked")}
                </span>
              </div>
              <div style={{ height: 6, borderRadius: 999, background: "var(--surface-3)", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: pct > 60 ? "var(--busy)" : "var(--free)", borderRadius: 999 }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
