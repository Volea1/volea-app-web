"use client";

import { useEffect, useState } from "react";
import { EQUIPMENT, equipmentById, HOURS } from "@/lib/data";
import type { TFunction } from "@/lib/i18n";
import type { Booking, Cart, Court, Friend, Lang, UserProfile } from "@/lib/types";
import { addMin, iconBtnStyle } from "@/lib/utils";
import { Badge, Button, CourtDiagram, Stepper } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/Icon";

export interface BookingCompletePayload {
  booking: Omit<Booking, "id">;
  sharedFriendIds: string[];
  date: string;
  slots: number[];
  players: number;
  gear: { id: string; qty: number }[];
}

interface BookingSheetProps {
  t: TFunction;
  lang: Lang;
  open: boolean;
  court: Court | null;
  slotIndices: number[];
  bookingDate: string;
  cart: Cart;
  profile: UserProfile;
  friends: Friend[];
  addGear: (id: string) => void;
  removeGear: (id: string) => void;
  onClose: () => void;
  onComplete?: (payload: BookingCompletePayload) => void | Promise<void>;
}

const gearIcon: Record<string, IconName> = {
  racket: "trophy",
  ball: "court",
  shoe: "user",
  extra: "star",
};

const STEP_KEYS = ["stepCourt", "stepEquipment", "stepPayment"] as const;

function SummaryBlock({
  t,
  court,
  timeStart,
  timeEnd,
  slotCount,
  players,
  gearLines,
  total,
  flat,
}: {
  t: TFunction;
  court: Court;
  timeStart: string;
  timeEnd: string;
  slotCount: number;
  players: number;
  gearLines: [string, number][];
  total: number;
  flat?: boolean;
}) {
  const rows: [string, string | number][] = [
    [t("court"), court.name],
    [t("time"), `${timeStart}–${timeEnd}`],
    [t("players"), players],
  ];
  if (slotCount > 1) rows.push([t("selectedSlots"), slotCount]);
  return (
    <div className="col gap-2" style={{ fontSize: 14 }}>
      {!flat && (
        <div className="eyebrow" style={{ marginBottom: 6 }}>
          {t("summary")}
        </div>
      )}
      {rows.map(([k, v]) => (
        <div key={k} className="row" style={{ justifyContent: "space-between" }}>
          <span className="muted">{k}</span>
          <span style={{ fontWeight: 600 }}>{v}</span>
        </div>
      ))}
      <div className="row" style={{ justifyContent: "space-between" }}>
        <span className="muted">{t("court")}</span>
        <span>{court.price * slotCount} €</span>
      </div>
      {gearLines.map(([id, q]) => {
        const e = equipmentById(id)!;
        return (
          <div key={id} className="row" style={{ justifyContent: "space-between" }}>
            <span className="muted">
              {q}× {e.name}
            </span>
            <span>{q * e.price} €</span>
          </div>
        );
      })}
      <div style={{ height: 1, background: "var(--line)", margin: "6px 0" }} />
      <div className="row" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontWeight: 600 }}>{t("total")}</span>
        <span className="display" style={{ fontSize: 22, color: "var(--accent)" }}>
          {total} €
        </span>
      </div>
    </div>
  );
}

export function BookingSheet({
  t,
  open,
  court,
  slotIndices,
  bookingDate,
  cart,
  profile,
  friends,
  addGear,
  removeGear,
  onClose,
  onComplete,
}: BookingSheetProps) {
  const [step, setStep] = useState(0);
  const [players, setPlayers] = useState(4);
  const [payWith, setPayWith] = useState("card");
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && court) {
      setStep(0);
      setPlayers(court.mode === "Einzel" ? 2 : 4);
      setSelectedFriends([]);
      setError(null);
      setSaving(false);
    }
  }, [open, court]);

  function toggleFriend(id: string) {
    setSelectedFriends((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handlePay() {
    if (!court) return;
    const sorted = [...slotIndices].sort((a, b) => a - b);
    const timeStart = HOURS[sorted[0]];
    const slotCount = sorted.length;
    const gearTotal = Object.entries(cart).reduce((s, [id, q]) => s + (equipmentById(id)?.price || 0) * q, 0);
    const total = court.price * slotCount + gearTotal;
    const shareCount = selectedFriends.length + 1;
    const sharePrice = Math.round((total / shareCount) * 100) / 100;
    const gearLines = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => `${q}× ${equipmentById(id)!.name}`);
    const gearItems = Object.entries(cart)
      .filter(([, q]) => q > 0)
      .map(([id, q]) => ({ id, qty: q }));
    const sharedNames = friends.filter((f) => selectedFriends.includes(f.id)).map((f) => f.name);

    setError(null);
    setSaving(true);
    try {
      await onComplete?.({
        booking: {
          court: court.id,
          date: bookingDate,
          slot: sorted[0],
          slots: sorted,
          time: timeStart,
          players,
          gear: gearLines,
          price: selectedFriends.length > 0 ? sharePrice : total,
          status: selectedFriends.length > 0 ? t("awaitingFriends") : t("confirmed"),
          shared: selectedFriends.length > 0,
          sharedWith: sharedNames,
          sharePrice: selectedFriends.length > 0 ? sharePrice : undefined,
        },
        sharedFriendIds: selectedFriends,
        date: bookingDate,
        slots: sorted,
        players,
        gear: gearItems,
      });
      setStep(3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Buchung fehlgeschlagen");
    } finally {
      setSaving(false);
    }
  }

  if (!open || !court || slotIndices.length === 0) return null;

  const sorted = [...slotIndices].sort((a, b) => a - b);
  const timeStart = HOURS[sorted[0]];
  const timeEnd = addMin(HOURS[sorted[sorted.length - 1]]);
  const slotCount = sorted.length;
  const gearTotal = Object.entries(cart).reduce((s, [id, q]) => s + (equipmentById(id)?.price || 0) * q, 0);
  const total = court.price * slotCount + gearTotal;
  const gearLines = Object.entries(cart).filter(([, q]) => q > 0) as [string, number][];
  const steps = [t("newBooking"), t("equipment"), t("pay"), t("done")];
  const playerOptions = court.mode === "Einzel" ? [1, 2] : [1, 2, 3, 4];
  const shareCount = selectedFriends.length + 1;
  const sharePrice = Math.round((total / shareCount) * 100) / 100;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", justifyContent: "flex-end" }}>
      <div
        role="presentation"
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(8,7,5,0.55)",
          backdropFilter: "blur(3px)",
          animation: "viewIn .25s both",
        }}
      />
      <div
        className="col"
        style={{
          position: "relative",
          width: "min(480px, 100%)",
          height: "100%",
          background: "var(--surface)",
          borderLeft: "1px solid var(--line-strong)",
          boxShadow: "-30px 0 80px -40px rgba(0,0,0,.7)",
          animation: "sheetIn .32s cubic-bezier(.2,.7,.2,1) both",
        }}
      >
        <div className="row" style={{ justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid var(--line)" }}>
          <div className="row gap-2">
            {step > 0 && step < 3 && (
              <button type="button" onClick={() => setStep(step - 1)} style={iconBtnStyle}>
                <Icon name="arrowL" size={18} />
              </button>
            )}
            <span className="display" style={{ fontSize: 20 }}>
              {steps[step]}
            </span>
          </div>
          <button type="button" onClick={onClose} style={iconBtnStyle}>
            <Icon name="close" size={18} />
          </button>
        </div>

        {step < 3 && (
          <div
            className="row"
            style={{
              padding: "14px 22px 0",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            {STEP_KEYS.map((key, i) => (
              <span key={key} className="row gap-2" style={{ alignItems: "center" }}>
                {i > 0 && (
                  <span className="muted" style={{ opacity: 0.5 }}>
                    |
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setStep(i)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                    fontSize: "inherit",
                    fontWeight: "inherit",
                    color: i === step ? "var(--accent)" : i < step ? "var(--ink-2)" : "var(--ink-faint)",
                    textDecoration: i === step ? "underline" : "none",
                    textUnderlineOffset: 3,
                  }}
                >
                  {t(key)}
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="grow" style={{ overflowY: "auto", padding: 22 }}>
          {step < 3 && (
            <div className="card" style={{ padding: 16, display: "flex", gap: 14, alignItems: "center", marginBottom: 20, background: "var(--surface-2)" }}>
              <div style={{ width: 96, flexShrink: 0 }}>
                <CourtDiagram w={96} accent single={court.mode === "Einzel"} />
              </div>
              <div className="grow">
                <div className="row gap-2">
                  <span style={{ fontWeight: 600, fontSize: 17 }}>{court.name}</span>
                  <Badge soft>{court.mode}</Badge>
                  {slotCount > 1 && <Badge tone="accent" soft>{slotCount}× 90 Min</Badge>}
                </div>
                <div className="row gap-3 muted" style={{ fontSize: 13, marginTop: 6 }}>
                  <span className="row gap-1">
                    <Icon name="clock" size={14} />
                    {timeStart}–{timeEnd}
                  </span>
                  <span className="row gap-1">
                    <Icon name="court" size={14} />
                    {court.mode}
                  </span>
                </div>
              </div>
            </div>
          )}

          {step === 0 && (
            <div className="col gap-5">
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  {t("players")}
                </div>
                <div className="row gap-2">
                  {playerOptions.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setPlayers(n)}
                      style={{
                        flex: 1,
                        padding: "14px 0",
                        borderRadius: 12,
                        cursor: "pointer",
                        fontFamily: "var(--font-display)",
                        fontSize: 22,
                        border: `1px solid ${players === n ? "var(--accent)" : "var(--line-strong)"}`,
                        background: players === n ? "var(--soon-soft)" : "transparent",
                        color: players === n ? "var(--accent)" : "var(--ink-2)",
                        transition: "all .18s",
                      }}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="eyebrow" style={{ marginBottom: 10 }}>
                  {t("shareWithFriends")}
                </div>
                <p className="muted" style={{ fontSize: 12.5, margin: "0 0 10px", lineHeight: 1.5 }}>
                  {t("shareBookingInfo")}
                </p>
                <div className="col gap-2">
                  {friends.map((f) => {
                    const on = selectedFriends.includes(f.id);
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => toggleFriend(f.id)}
                        className="row gap-3"
                        style={{
                          width: "100%",
                          padding: "10px 12px",
                          borderRadius: 10,
                          cursor: "pointer",
                          textAlign: "left",
                          border: `1px solid ${on ? "var(--accent)" : "var(--line)"}`,
                          background: on ? "var(--soon-soft)" : "transparent",
                        }}
                      >
                        <div
                          style={{
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            background: "var(--surface-3)",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 11,
                            fontWeight: 700,
                            color: on ? "var(--accent)" : "var(--ink-2)",
                            flexShrink: 0,
                          }}
                        >
                          {f.initials}
                        </div>
                        <div className="grow" style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13.5 }}>{f.name}</div>
                          <div className="muted" style={{ fontSize: 11.5 }}>{f.level}</div>
                        </div>
                        {on && <Icon name="check" size={16} style={{ color: "var(--accent)" }} />}
                      </button>
                    );
                  })}
                </div>
                {selectedFriends.length > 0 && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
                    {t("yourShare")}: <strong style={{ color: "var(--accent)" }}>{sharePrice} €</strong> ({shareCount} {t("players")})
                  </div>
                )}
              </div>
              <div className="card" style={{ padding: 16, background: "var(--surface-2)" }}>
                <div className="row" style={{ justifyContent: "space-between" }}>
                  <div className="row gap-2">
                    <Icon name="gear" size={18} style={{ color: "var(--accent)" }} />
                    <span style={{ fontWeight: 600 }}>{t("addGear")}</span>
                  </div>
                  <Button size="sm" variant="ghost" iconRight="arrowR" onClick={() => setStep(1)}>
                    {t("rent")}
                  </Button>
                </div>
                {gearLines.length > 0 && (
                  <div className="muted" style={{ fontSize: 12.5, marginTop: 10 }}>
                    {gearLines.map(([id, q]) => `${q}× ${equipmentById(id)!.name}`).join(" · ")}
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="col gap-3">
              {EQUIPMENT.map((e) => {
                const q = cart[e.id] || 0;
                return (
                  <div
                    key={e.id}
                    className="row"
                    style={{
                      gap: 12,
                      padding: "12px 14px",
                      border: "1px solid var(--line)",
                      borderRadius: 12,
                      background: q ? "var(--soon-soft)" : "transparent",
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 9,
                        background: "var(--surface-3)",
                        display: "grid",
                        placeItems: "center",
                        color: "var(--accent)",
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={gearIcon[e.cat]} size={18} />
                    </div>
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{e.name}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {e.price} € {t("perItem")}
                      </div>
                    </div>
                    {q === 0 ? (
                      <button type="button" onClick={() => addGear(e.id)} style={iconBtnStyle}>
                        <Icon name="plus" size={16} />
                      </button>
                    ) : (
                      <div className="row gap-2" style={{ background: "var(--surface)", borderRadius: 999, padding: 2, border: "1px solid var(--line)" }}>
                        <Stepper icon="minus" onClick={() => removeGear(e.id)} />
                        <span className="mono" style={{ minWidth: 16, textAlign: "center", fontWeight: 600, fontSize: 13 }}>
                          {q}
                        </span>
                        <Stepper icon="plus" onClick={() => addGear(e.id)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {step === 2 && (
            <div className="col gap-5">
              <div className="col gap-2">
                <div className="eyebrow" style={{ marginBottom: 4 }}>
                  {t("payWith")}
                </div>
                {[
                  { id: "credit", label: t("clubCredit"), sub: `${profile.credit} € ${t("availableNow")}`, icon: "euro" as IconName },
                  { id: "card", label: t("card"), sub: "•••• 4729 · Visa", icon: "card" as IconName },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPayWith(m.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "14px 16px",
                      borderRadius: 12,
                      cursor: "pointer",
                      textAlign: "left",
                      border: `1px solid ${payWith === m.id ? "var(--accent)" : "var(--line-strong)"}`,
                      background: payWith === m.id ? "var(--soon-soft)" : "transparent",
                    }}
                  >
                    <Icon name={m.icon} size={20} style={{ color: "var(--accent)" }} />
                    <div className="grow">
                      <div style={{ fontWeight: 600, fontSize: 14.5 }}>{m.label}</div>
                      <div className="muted" style={{ fontSize: 12.5 }}>
                        {m.sub}
                      </div>
                    </div>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `2px solid ${payWith === m.id ? "var(--accent)" : "var(--line-strong)"}`,
                        display: "grid",
                        placeItems: "center",
                      }}
                    >
                      {payWith === m.id && (
                        <div style={{ width: 9, height: 9, borderRadius: "50%", background: "var(--accent)" }} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
              {selectedFriends.length > 0 && (
                <div className="card" style={{ padding: 14, background: "var(--soon-soft)", border: "1px solid color-mix(in oklab, var(--accent) 30%, transparent)" }}>
                  <div className="row" style={{ justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ fontWeight: 600 }}>{t("splitCost")}</span>
                    <span className="display" style={{ fontSize: 18, color: "var(--accent)" }}>
                      {sharePrice} € {t("perPerson")}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
                    {shareCount} {t("players")} · {t("total")} {total} €
                  </div>
                </div>
              )}
              <SummaryBlock
                t={t}
                court={court}
                timeStart={timeStart}
                timeEnd={timeEnd}
                slotCount={slotCount}
                players={players}
                gearLines={gearLines}
                total={selectedFriends.length > 0 ? sharePrice : total}
              />
            </div>
          )}

          {step === 3 && (
            <div className="col" style={{ alignItems: "center", textAlign: "center", paddingTop: 30, gap: 18 }}>
              <div
                style={{
                  width: 84,
                  height: 84,
                  borderRadius: "50%",
                  background: "var(--free-soft)",
                  border: "1px solid color-mix(in oklab, var(--free) 40%, transparent)",
                  display: "grid",
                  placeItems: "center",
                  animation: "popIn .4s both",
                }}
              >
                <Icon name="check" size={40} style={{ color: "var(--free)" }} />
              </div>
              <div>
                <h2 className="display" style={{ fontSize: 26, margin: "0 0 6px" }}>
                  {t("confirmed")}
                </h2>
                <p className="muted" style={{ margin: 0, fontSize: 14.5 }}>
                  {court.name} · {t("today")} · {timeStart}–{timeEnd}
                </p>
              </div>
              <div className="card" style={{ padding: 18, width: "100%", background: "var(--surface-2)" }}>
                <SummaryBlock
                  t={t}
                  court={court}
                  timeStart={timeStart}
                  timeEnd={timeEnd}
                  slotCount={slotCount}
                  players={players}
                  gearLines={gearLines}
                  total={total}
                  flat
                />
              </div>
              <Button full size="lg" onClick={onClose} icon="check">
                {t("viewBooking")}
              </Button>
            </div>
          )}
        </div>

        {step < 3 && (
          <div className="row" style={{ justifyContent: "space-between", padding: "16px 22px", borderTop: "1px solid var(--line)", gap: 16 }}>
            <div>
              <div className="muted" style={{ fontSize: 11.5 }}>{t("total")}</div>
              <div className="display" style={{ fontSize: 26 }}>{total} €</div>
              {selectedFriends.length > 0 && (
                <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>
                  {t("yourShare")}:{" "}
                  <strong style={{ color: "var(--accent)", fontWeight: 600 }}>{sharePrice} €</strong>
                </div>
              )}
            </div>
            {step === 0 && (
              <Button size="lg" iconRight="arrowR" onClick={() => setStep(1)}>
                {t("continue")}
              </Button>
            )}
            {step === 1 && (
              <Button size="lg" iconRight="arrowR" onClick={() => setStep(2)}>
                {t("continue")}
              </Button>
            )}
            {step === 2 && (
              <div className="col gap-2">
                {error && (
                  <p style={{ color: "var(--busy)", fontSize: 13, margin: 0 }}>{error}</p>
                )}
                <Button size="lg" icon="check" onClick={handlePay} disabled={saving}>
                  {saving ? t("processing") : t("payNow")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
