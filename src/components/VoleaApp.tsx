"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthScreen } from "@/components/auth/AuthScreen";
import { AdminBookings, AdminCourts, AdminOverview } from "@/components/admin/AdminScreens";
import { BookingSheet } from "@/components/booking/BookingSheet";
import type { BookingCompletePayload } from "@/components/booking/BookingSheet";
import { AccountScreen } from "@/components/player/AccountScreen";
import { BookingsScreen } from "@/components/player/BookingsScreen";
import { EquipmentScreen } from "@/components/player/EquipmentScreen";
import { FriendsScreen } from "@/components/player/FriendsScreen";
import { PlayerHome } from "@/components/player/PlayerHome";
import { Avatar, Logo, Segmented } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import type { IconName } from "@/components/ui/Icon";
import { ADMIN_EMAIL, CLUB_FRIENDS, PENDING_SHARED, courtById, profileFromAuth } from "@/lib/data";
import { makeT } from "@/lib/i18n";
import { clearSession, loadSession, saveSession } from "@/lib/session";
import {
  authUserFromApi,
  cancelBooking as cancelBookingApi,
  createBooking,
  fetchMe,
  fetchMyBookings,
  profileFromApi,
  signOut,
  toIsoDate,
} from "@/lib/api";
import type {
  AccentKey,
  AdminView,
  AppView,
  AuthUser,
  Booking,
  BookingSheetState,
  Cart,
  Court,
  DensityKey,
  FontKey,
  Lang,
  PlayerView,
  Role,
  SharedBooking,
  Theme,
  UserProfile,
} from "@/lib/types";
import { ACCENTS, DENSITY, FONTS } from "@/lib/utils";

export function VoleaApp() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccent] = useState<AccentKey>("brass");
  const [font, setFont] = useState<FontKey>("classic");
  const [density, setDensity] = useState<DensityKey>("regular");
  const [lang, setLang] = useState<Lang>("de");

  const [authed, setAuthed] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<Role>("player");
  const [view, setView] = useState<AppView>("home");
  const [cart, setCart] = useState<Cart>({});
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [sharedBookings, setSharedBookings] = useState<SharedBooking[]>(PENDING_SHARED);
  const [sheet, setSheet] = useState<BookingSheetState>({
    open: false,
    court: null,
    slots: [],
    date: toIsoDate(new Date()),
  });
  const [remoteProfile, setRemoteProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = loadSession();
      if (!stored) {
        if (!cancelled) setAuthReady(true);
        return;
      }
      try {
        const me = await fetchMe(stored.token);
        if (cancelled) return;
        const authUser = authUserFromApi(stored.token, me);
        saveSession(authUser);
        setUser(authUser);
        setRemoteProfile(profileFromApi(me, me.email));
        setAuthed(true);
        const mine = await fetchMyBookings(stored.token);
        if (!cancelled) setBookings(mine);
      } catch {
        clearSession();
      }
      if (!cancelled) setAuthReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const t = useMemo(() => makeT(lang), [lang]);

  const profile: UserProfile = useMemo(() => {
    if (remoteProfile) return remoteProfile;
    if (!user) return profileFromAuth(ADMIN_EMAIL);
    return profileFromAuth(user.email, user.name);
  }, [user, remoteProfile]);

  const isAdmin = user?.role === "admin" || user?.email.toLowerCase() === ADMIN_EMAIL;

  const rootStyle = useMemo(() => {
    const acc = ACCENTS[accent];
    const fnt = FONTS[font];
    return {
      "--accent": acc.accent,
      "--accent-ink": acc.ink,
      "--font-display": fnt.display,
      "--font-ui": fnt.ui,
      "--page-pad": `clamp(18px, 3.4vw, ${DENSITY[density]})`,
      minHeight: "100%",
    } as React.CSSProperties;
  }, [accent, font, density]);

  const addGear = useCallback((id: string) => {
    setCart((c) => ({ ...c, [id]: (c[id] || 0) + 1 }));
  }, []);

  const removeGear = useCallback((id: string) => {
    setCart((c) => {
      const n = { ...c };
      n[id] = (n[id] || 0) - 1;
      if (n[id] <= 0) delete n[id];
      return n;
    });
  }, []);

  const openBooking = useCallback((court: Court, slots: number[], date?: string) => {
    setSheet({ open: true, court, slots, date: date || toIsoDate(new Date()) });
  }, []);

  const switchRole = useCallback((r: Role) => {
    if (r === "admin" && !isAdmin) return;
    setRole(r);
    setView(r === "player" ? "home" : "overview");
  }, [isAdmin]);

  const handleAuth = useCallback((authUser: AuthUser) => {
    saveSession(authUser);
    setUser(authUser);
    setAuthed(true);
    setRole("player");
    setView("home");
    (async () => {
      try {
        const me = await fetchMe(authUser.token);
        setRemoteProfile(profileFromApi(me, me.email));
        const mine = await fetchMyBookings(authUser.token);
        setBookings(mine);
      } catch {
        setBookings([]);
      }
    })();
  }, []);

  const handleLogout = useCallback(async () => {
    if (user?.token) await signOut(user.token);
    clearSession();
    setAuthed(false);
    setUser(null);
    setRemoteProfile(null);
    setBookings([]);
    setRole("player");
    setView("home");
  }, [user]);

  const handleBookingComplete = useCallback(
    async (payload: BookingCompletePayload) => {
      if (!user) throw new Error("not authenticated");
      const created = await createBooking(user.token, {
        court_id: payload.booking.court,
        booking_date: payload.date,
        slots: payload.slots,
        players: payload.players,
        gear: payload.gear,
      });
      setBookings((prev) => [...prev, created]);
      try {
        const me = await fetchMe(user.token);
        setRemoteProfile(profileFromApi(me, me.email));
      } catch {
        /* keep existing profile */
      }

      if (payload.sharedFriendIds.length > 0) {
        const friends = CLUB_FRIENDS.filter((f) => payload.sharedFriendIds.includes(f.id));
        const shareCount = friends.length + 1;
        const sharePrice = payload.booking.sharePrice ?? Math.round((payload.booking.price * shareCount) / shareCount);
        const shared: SharedBooking = {
          id: `sb${Date.now()}`,
          court: payload.booking.court,
          date: payload.booking.date,
          slot: payload.booking.slot,
          time: payload.booking.time,
          totalPrice: sharePrice * shareCount,
          gear: payload.booking.gear,
          organizerName: user.name,
          organizerEmail: user.email,
          participants: [
            ...friends.map((f) => ({
              friendId: f.id,
              name: f.name,
              initials: f.initials,
              status: "pending" as const,
              share: sharePrice,
            })),
          ],
          status: "awaiting",
        };
        setSharedBookings((prev) => [...prev, shared]);
      }
    },
    [user]
  );

  const confirmSharedBooking = useCallback((id: string) => {
    setSharedBookings((prev) =>
      prev.map((sb) => {
        if (sb.id !== id) return sb;
        const updated = sb.participants.map((p) =>
          p.friendId === "me" ? { ...p, status: "confirmed" as const } : p
        );
        const allConfirmed = updated.every((p) => p.status === "confirmed");
        return { ...sb, participants: updated, status: allConfirmed ? "confirmed" : "awaiting" };
      })
    );
    const sb = sharedBookings.find((x) => x.id === id);
    if (sb) {
      const myPart = sb.participants.find((p) => p.friendId === "me");
      if (myPart) {
        setBookings((prev) => [
          ...prev,
          {
            id: `b-share-${id}`,
            court: sb.court,
            date: sb.date,
            slot: sb.slot,
            time: sb.time,
            players: sb.participants.length + 1,
            gear: sb.gear,
            price: myPart.share,
            status: "bestätigt",
            shared: true,
            sharedWith: [sb.organizerName],
            sharePrice: myPart.share,
          },
        ]);
      }
    }
  }, [sharedBookings]);

  const cancelBooking = useCallback(
    async (id: string) => {
      if (!user) return;
      await cancelBookingApi(user.token, id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      try {
        const me = await fetchMe(user.token);
        setRemoteProfile(profileFromApi(me, me.email));
      } catch {
        /* keep existing profile */
      }
    },
    [user]
  );

  const editBooking = useCallback(
    (id: string) => {
      const b = bookings.find((x) => x.id === id);
      if (b) {
        openBooking(courtById(b.court), b.slots?.length ? b.slots : [b.slot], b.date);
        setView("home");
      }
    },
    [bookings, openBooking]
  );

  if (!authReady) return null;

  if (!authed) {
    return (
      <div data-theme={theme} style={rootStyle}>
        <AuthScreen t={t} onAuth={handleAuth} />
      </div>
    );
  }

  const playerNav: { id: PlayerView; label: string; icon: IconName }[] = [
    { id: "home", label: t("courts"), icon: "today" },
    { id: "bookings", label: t("myBookings"), icon: "clock" },
    { id: "friends", label: t("friends"), icon: "users" },
    { id: "equipment", label: t("equipment"), icon: "gear" },
    { id: "account", label: t("account"), icon: "user" },
  ];

  const adminNav: { id: AdminView; label: string; icon: IconName }[] = [
    { id: "overview", label: t("overview"), icon: "chart" },
    { id: "bookings", label: t("bookings"), icon: "today" },
    { id: "courts", label: t("courts"), icon: "grid" },
  ];

  const nav = role === "player" ? playerNav : adminNav;

  let screen: React.ReactNode = null;
  if (role === "player") {
    if (view === "home")
      screen = (
        <PlayerHome
          t={t}
          lang={lang}
          profile={profile}
          token={user?.token ?? ""}
          onBook={openBooking}
          goEquip={() => setView("equipment")}
        />
      );
    else if (view === "bookings")
      screen = <BookingsScreen t={t} bookings={bookings} onCancel={cancelBooking} onEdit={editBooking} />;
    else if (view === "friends")
      screen = <FriendsScreen t={t} friends={CLUB_FRIENDS} />;
    else if (view === "equipment")
      screen = (
        <EquipmentScreen t={t} lang={lang} cart={cart} addGear={addGear} removeGear={removeGear} goCheckout={() => setView("home")} />
      );
    else if (view === "account")
      screen = (
        <AccountScreen
          t={t}
          profile={profile}
          bookings={bookings}
          sharedBookings={sharedBookings}
          onConfirmShare={confirmSharedBooking}
          theme={theme}
          accent={accent}
          font={font}
          density={density}
          lang={lang}
          onTheme={setTheme}
          onAccent={setAccent}
          onFont={setFont}
          onDensity={setDensity}
          onLang={setLang}
        />
      );
  } else {
    if (view === "overview") screen = <AdminOverview t={t} />;
    else if (view === "bookings") screen = <AdminBookings t={t} lang={lang} token={user?.token ?? ""} />;
    else if (view === "courts") screen = <AdminCourts t={t} lang={lang} token={user?.token ?? ""} />;
  }

  const roleToggle = isAdmin ? (
    <Segmented
      value={role}
      onChange={(v) => switchRole(v as Role)}
      size="sm"
      options={[
        { value: "player", label: t("player"), icon: "user" },
        { value: "admin", label: t("admin"), icon: "shield" },
      ]}
    />
  ) : null;

  return (
    <div className="app-bg" data-theme={theme} style={rootStyle}>
      <div className="shell">
        <aside className="sidebar">
          <div style={{ padding: "22px 20px 18px" }}>
            <Logo size={21} href="/" />
          </div>
          {roleToggle && <div style={{ padding: "0 16px 16px" }}>{roleToggle}</div>}
          <nav className="col gap-1" style={{ padding: "6px 12px", flex: 1 }}>
            {nav.map((n) => (
              <NavItem key={n.id} n={n} active={view === n.id} onClick={() => setView(n.id)} />
            ))}
          </nav>
          {role === "player" && (
            <div style={{ padding: "12px 16px" }}>
              <div className="card" style={{ padding: 14, background: "var(--surface-2)" }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>
                  {t("credit")}
                </div>
                <div className="display" style={{ fontSize: 24, color: "var(--accent)" }}>
                  {profile.credit} €
                </div>
                <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                  {t("monthlyQuota")}: {profile.monthlyUsed}/{profile.monthlyQuota}
                </div>
              </div>
            </div>
          )}
          <div
            role="button"
            tabIndex={0}
            className="row"
            onClick={() => setView("account")}
            onKeyDown={(e) => e.key === "Enter" && setView("account")}
            style={{
              gap: 10,
              padding: "14px 18px",
              borderTop: "1px solid var(--line)",
              cursor: "pointer",
              width: "100%",
              transition: "background .15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "var(--surface-2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <Avatar initials={profile.initials} size={36} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: "var(--ink)" }}>
                {profile.name}
              </div>
              <div className="muted" style={{ fontSize: 11.5 }}>
                {role === "admin" ? "Club-Manager" : profile.member}
              </div>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleLogout();
              }}
              title={t("logout")}
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                border: "1px solid var(--line)",
                background: "var(--surface-2)",
                color: "var(--ink-2)",
                cursor: "pointer",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        </aside>

        <div className="content">
          <header className="topbar">
            <Logo size={18} href="/" />
            <div className="grow" />
            {roleToggle}
          </header>

          <main className="main" key={role + view}>
            {screen}
          </main>

          <nav className="bottom-nav">
            {nav.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => setView(n.id)}
                className="bn-item"
                style={{ color: view === n.id ? "var(--accent)" : "var(--ink-3)" }}
              >
                <Icon name={n.icon} size={21} />
                <span style={{ fontSize: 10.5, fontWeight: 600 }}>{n.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <BookingSheet
        t={t}
        lang={lang}
        open={sheet.open}
        court={sheet.court}
        slotIndices={sheet.slots}
        bookingDate={sheet.date}
        cart={cart}
        profile={profile}
        friends={CLUB_FRIENDS}
        addGear={addGear}
        removeGear={removeGear}
        onComplete={handleBookingComplete}
        onClose={() => setSheet({ open: false, court: null, slots: [], date: toIsoDate(new Date()) })}
      />
    </div>
  );
}

function NavItem({
  n,
  active,
  onClick,
}: {
  n: { id: string; label: string; icon: IconName };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="row gap-3"
      style={{
        width: "100%",
        padding: "11px 14px",
        borderRadius: 11,
        cursor: "pointer",
        textAlign: "left",
        border: "none",
        fontFamily: "var(--font-ui)",
        fontWeight: 600,
        fontSize: 14.5,
        transition: "all .16s",
        background: active ? "var(--surface-3)" : "transparent",
        color: active ? "var(--ink)" : "var(--ink-3)",
      }}
    >
      <Icon name={n.icon} size={19} style={{ color: active ? "var(--accent)" : "var(--ink-3)" }} />
      {n.label}
      {active && (
        <span style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
      )}
    </button>
  );
}
