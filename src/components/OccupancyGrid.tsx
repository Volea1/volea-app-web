"use client";

import { COURTS, HOURS, TYPE_LABEL } from "@/lib/data";
import { emptyGrid } from "@/lib/api";
import type { TFunction } from "@/lib/i18n";
import type { Court, Lang, SlotCell } from "@/lib/types";
import { Icon } from "@/components/ui/Icon";

interface OccupancyGridProps {
  t: TFunction;
  lang: Lang;
  courts?: Court[];
  grid?: Record<number, SlotCell[]>;
  manage?: boolean;
  filterFree?: boolean;
  selectedCourtId?: number | null;
  selectedSlots?: number[];
  onCell?: (court: Court, slotIndex: number, cell: SlotCell) => void;
}

export function OccupancyGrid({
  t,
  lang,
  courts = COURTS,
  grid,
  manage,
  filterFree,
  selectedCourtId,
  selectedSlots = [],
  onCell,
}: OccupancyGridProps) {
  const cellLabel = { free: t("free"), booked: t("booked"), mine: t("mine") };
  const occupancy = grid ?? emptyGrid(courts);

  return (
    <div style={{ overflowX: "auto", paddingBottom: 4 }}>
      <div style={{ minWidth: 760 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: `132px repeat(${HOURS.length}, 1fr)`,
            gap: 6,
            marginBottom: 6,
          }}
        >
          <div />
          {HOURS.map((h) => (
            <div key={h} className="mono" style={{ textAlign: "center", fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>
              {h}
            </div>
          ))}
        </div>
        <div className="col" style={{ gap: 6 }}>
          {courts.map((c) => (
            <div
              key={c.id}
              style={{
                display: "grid",
                gridTemplateColumns: `132px repeat(${HOURS.length}, 1fr)`,
                gap: 6,
              }}
            >
              <div className="row gap-2" style={{ minWidth: 0 }}>
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: "var(--surface-3)",
                    border: "1px solid var(--line)",
                    display: "grid",
                    placeItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <span className="display" style={{ fontSize: 13, color: "var(--accent)" }}>
                    {c.id}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.name}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-faint)", letterSpacing: "0.04em" }}>
                    {TYPE_LABEL[c.type][lang]} · {c.mode}
                  </div>
                </div>
              </div>
              {(occupancy[c.id] ?? []).map((s, i) => {
                const dim = filterFree && s.state !== "free";
                const clickable = s.state === "free" || !!manage;
                const isSelected = selectedCourtId === c.id && selectedSlots.includes(i);
                const isMine = s.state === "mine";
                const colors = {
                  free: {
                    bg: isSelected ? "var(--soon-soft)" : "var(--free-soft)",
                    bd: isSelected ? "var(--accent)" : "color-mix(in oklab, var(--free) 34%, transparent)",
                    c: isSelected ? "var(--accent)" : "var(--free)",
                  },
                  booked: {
                    bg: "var(--busy-soft)",
                    bd: "color-mix(in oklab, var(--busy) 30%, transparent)",
                    c: "var(--busy)",
                  },
                  mine: {
                    bg: "color-mix(in oklab, var(--accent) 28%, var(--surface-2))",
                    bd: "var(--accent)",
                    c: "var(--accent)",
                  },
                }[s.state];
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!clickable}
                    onClick={() => clickable && onCell?.(c, i, s)}
                    title={`${c.name} · ${HOURS[i]} · ${cellLabel[s.state]}`}
                    className={isMine ? "slot-mine" : undefined}
                    style={{
                      height: isMine ? 38 : 34,
                      borderRadius: 8,
                      cursor: clickable ? "pointer" : "default",
                      background: colors.bg,
                      border: `${isSelected || isMine ? 2 : 1}px solid ${colors.bd}`,
                      opacity: dim ? 0.28 : 1,
                      display: "grid",
                      placeItems: "center",
                      transition: "transform .1s, box-shadow .2s, opacity .2s",
                      position: "relative",
                      boxShadow: isMine ? "0 0 0 1px color-mix(in oklab, var(--accent) 25%, transparent), var(--shadow-soft)" : isSelected ? "var(--shadow-soft)" : "none",
                      transform: isMine ? "scale(1.02)" : undefined,
                      zIndex: isMine || isSelected ? 1 : 0,
                    }}
                    onMouseEnter={(e) => {
                      if (clickable) {
                        e.currentTarget.style.transform = isMine ? "scale(1.04) translateY(-1px)" : "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "var(--shadow-soft)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = isMine ? "scale(1.02)" : "none";
                      e.currentTarget.style.boxShadow = isMine
                        ? "0 0 0 1px color-mix(in oklab, var(--accent) 25%, transparent), var(--shadow-soft)"
                        : isSelected
                          ? "var(--shadow-soft)"
                          : "none";
                    }}
                  >
                    {s.state === "free" ? (
                      isSelected ? (
                        <Icon name="check" size={14} style={{ color: colors.c }} />
                      ) : (
                        <Icon name="plus" size={14} style={{ color: colors.c, opacity: 0.8 }} />
                      )
                    ) : (
                      <span
                        style={{
                          fontSize: isMine ? 11.5 : 10.5,
                          fontWeight: 700,
                          color: colors.c,
                          padding: "0 4px",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "100%",
                          letterSpacing: isMine ? "0.04em" : undefined,
                          textTransform: isMine ? "uppercase" : undefined,
                        }}
                      >
                        {manage ? s.who : s.state === "mine" ? t("mine") : ""}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
