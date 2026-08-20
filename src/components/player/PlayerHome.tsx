"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { courtById, HOURS, occStatsFromGrid } from "@/lib/data";
import { emptyGrid, fetchOccupancyGrid, toIsoDate } from "@/lib/api";
import type { TFunction } from "@/lib/i18n";
import type { Court, SlotCell, UserProfile } from "@/lib/types";
import { addMin } from "@/lib/utils";
import { Button, Legend, Segmented, Stat } from "@/components/ui";
import { MonthCalendar } from "@/components/ui/MonthCalendar";
import { Icon } from "@/components/ui/Icon";
import { OccupancyGrid } from "@/components/OccupancyGrid";

interface PlayerHomeProps {
  t: TFunction;
  lang: "de" | "en";
  profile: UserProfile;
  token: string;
  onBook: (court: Court, slots: number[], date: string) => void;
  goEquip: () => void;
}

function areConsecutive(slots: number[]): boolean {
  if (slots.length <= 1) return true;
  const sorted = [...slots].sort((a, b) => a - b);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] !== sorted[i - 1] + 1) return false;
  }
  return true;
}

export function PlayerHome({ t, lang, profile, token, onBook, goEquip }: PlayerHomeProps) {
  const [filterFree, setFilterFree] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [selectedCourtId, setSelectedCourtId] = useState<number | null>(null);
  const [selectedSlots, setSelectedSlots] = useState<number[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [grid, setGrid] = useState<Record<number, SlotCell[]>>(() => emptyGrid());
  const gridRef = useRef<HTMLDivElement>(null);
  const st = occStatsFromGrid(grid);

  const quotaLeft = profile.monthlyQuota - profile.monthlyUsed;

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    let cancelled = false;
    const iso = toIsoDate(selectedDate);
    fetchOccupancyGrid(iso, token)
      .then((next) => {
        if (!cancelled) setGrid(next);
      })
      .catch(() => {
        if (!cancelled) setGrid(emptyGrid());
      });
    return () => {
      cancelled = true;
    };
  }, [selectedDate, token]);

  const handleDateSelect = useCallback((d: Date) => {
    setSelectedDate(d);
    setSelectedCourtId(null);
    setSelectedSlots([]);
    window.setTimeout(() => {
      gridRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, []);

  const handleCell = useCallback(
    (court: Court, slotIndex: number, cell: SlotCell) => {
      if (cell.state !== "free") return;

      if (quotaLeft <= 0) {
        setToast(t("quotaExceeded"));
        return;
      }

      if (selectedCourtId !== court.id) {
        setSelectedCourtId(court.id);
        setSelectedSlots([slotIndex]);
        return;
      }

      const next = selectedSlots.includes(slotIndex)
        ? selectedSlots.filter((s) => s !== slotIndex)
        : [...selectedSlots, slotIndex];

      if (next.length === 0) {
        setSelectedCourtId(null);
        setSelectedSlots([]);
        return;
      }

      if (!areConsecutive(next)) {
        setToast(t("slotsNotConsecutive"));
        return;
      }

      if (next.length > quotaLeft) {
        setToast(t("quotaExceeded"));
        return;
      }

      setSelectedSlots(next.sort((a, b) => a - b));
    },
    [selectedCourtId, selectedSlots, quotaLeft, t]
  );

  const handleBook = () => {
    if (!selectedCourtId || selectedSlots.length === 0) return;
    if (selectedSlots.length > quotaLeft) {
      setToast(t("quotaExceeded"));
      return;
    }
    onBook(courtById(selectedCourtId), selectedSlots, toIsoDate(selectedDate));
    setSelectedCourtId(null);
    setSelectedSlots([]);
  };

  const dateLabel = selectedDate.toLocaleDateString(lang === "de" ? "de-DE" : "en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  const selectedCourt = selectedCourtId ? courtById(selectedCourtId) : null;
  const timeRange =
    selectedSlots.length > 0
      ? `${HOURS[selectedSlots[0]]}–${addMin(HOURS[selectedSlots[selectedSlots.length - 1]])}`
      : null;
  const bookingTotal = selectedCourt ? selectedCourt.price * selectedSlots.length : 0;

  return (
    <>
    <div className="view-in col gap-6" style={{ padding: "var(--page-pad)", paddingBottom: selectedSlots.length ? 100 : undefined }}>
      <div className="row" style={{ justifyContent: "space-between", flexWrap: "wrap", gap: 16, alignItems: "flex-end" }}>
        <div>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {t("greeting")}, {profile.name.split(" ")[0]}
          </div>
          <h1 className="display" style={{ fontSize: "clamp(28px, 4vw, 40px)", margin: 0 }}>
            {t("availability")}
          </h1>
        </div>
        <Segmented
          value={filterFree ? "free" : "all"}
          onChange={(v) => setFilterFree(v === "free")}
          options={[
            { value: "all", label: t("filterAll") },
            { value: "free", label: t("filterFree"), icon: "check" },
          ]}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14 }}>
        <Stat icon="court" label={t("courtsBusy")} value={`${st.booked}/${st.total}`} sub={`${st.pct}%`} />
        <Stat icon="check" label={t("openSlots")} value={st.free} tone="var(--free)" />
        <Stat
          icon="star"
          label={t("monthlyQuota")}
          value={`${profile.monthlyUsed}/${profile.monthlyQuota}`}
          sub={`${quotaLeft} ${t("quotaRemaining")}`}
          tone={quotaLeft <= 1 ? "var(--busy)" : "var(--accent)"}
        />
        <Stat icon="bolt" label={t("peakAt")} value="20:00" sub="92%" tone="var(--busy)" />
      </div>

      <div className="col gap-3">
        <div className="eyebrow">{t("selectDay")}</div>
        <MonthCalendar selected={selectedDate} onSelect={handleDateSelect} lang={lang} />
      </div>

      <div ref={gridRef} className="card" style={{ padding: "20px 20px 22px", scrollMarginTop: 24 }}>
        <div className="row" style={{ justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div className="row gap-2">
            <Icon name="today" size={18} style={{ color: "var(--accent)" }} />
            <span style={{ fontWeight: 600, fontSize: 15 }}>{dateLabel}</span>
          </div>
          <div className="row gap-4" style={{ fontSize: 12, color: "var(--ink-3)" }}>
            <Legend c="var(--free)" label={t("free")} />
            <Legend c="var(--busy)" label={t("booked")} />
            <Legend c="var(--accent)" label={t("mine")} />
          </div>
        </div>
        <OccupancyGrid
          t={t}
          lang={lang}
          grid={grid}
          filterFree={filterFree}
          selectedCourtId={selectedCourtId}
          selectedSlots={selectedSlots}
          onCell={handleCell}
        />
        <p className="muted" style={{ fontSize: 12.5, marginTop: 14, marginBottom: 0 }}>
          {t("selectSlot")} — {t("duration")} · 90 Min Blocks.
        </p>
      </div>

      <div
        className="card"
        style={{
          padding: 22,
          display: "flex",
          gap: 20,
          alignItems: "center",
          flexWrap: "wrap",
          background: "linear-gradient(120deg, var(--surface), color-mix(in oklab, var(--accent) 8%, var(--surface)))",
        }}
      >
        <div className="grow" style={{ minWidth: 240 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>
            {t("equipment")}
          </div>
          <h3 className="display" style={{ fontSize: 22, margin: "0 0 6px" }}>
            Premium-Schläger ab 8 €
          </h3>
          <p className="muted" style={{ margin: 0, fontSize: 14 }}>
            Head, Bullpadel & Nox — frisch bespannt, direkt am Court.
          </p>
        </div>
        <Button variant="outline" iconRight="arrowR" onClick={goEquip}>
          {t("rent")}
        </Button>
      </div>

      {toast && (
        <div className="toast-pop" role="status">
          <Icon name="clock" size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
          {toast}
        </div>
      )}
    </div>

    {selectedSlots.length > 0 && selectedCourt && (
      <div className="book-bar">
        <div>
          <div className="muted" style={{ fontSize: 12 }}>
            {selectedCourt.name} · {selectedSlots.length} {t("slotsSelected")}
          </div>
          <div className="display" style={{ fontSize: 20 }}>
            {timeRange}
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {t("total")}:{" "}
            <strong style={{ color: "var(--accent)", fontWeight: 600 }}>{bookingTotal} €</strong>
          </div>
        </div>
        <Button size="lg" iconRight="arrowR" onClick={handleBook}>
          {t("book")}
        </Button>
      </div>
    )}
    </>
  );
}
