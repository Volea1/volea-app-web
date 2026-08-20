"use client";

import { useState } from "react";
import { Button, Logo } from "@/components/ui";
import { Icon } from "@/components/ui/Icon";
import type { TFunction } from "@/lib/i18n";
import type { AuthUser } from "@/lib/types";
import { initialsFromName } from "@/lib/data";
import { ApiError, signInWithPassword, signUp } from "@/lib/api";

function Field({
  label,
  placeholder,
  type = "text",
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  type?: string;
  value?: string;
  onChange?: (v: string) => void;
}) {
  return (
    <label className="col gap-2">
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-2)", letterSpacing: "0.02em" }}>{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          background: "var(--surface-2)",
          border: "1px solid var(--line-strong)",
          borderRadius: "var(--radius-sm)",
          padding: "12px 14px",
          color: "var(--ink)",
          fontSize: 15,
          fontFamily: "var(--font-ui)",
          outline: "none",
          transition: "border-color .2s",
        }}
        onFocus={(e) => (e.target.style.borderColor = "var(--accent)")}
        onBlur={(e) => (e.target.style.borderColor = "var(--line-strong)")}
      />
    </label>
  );
}

interface AuthScreenProps {
  t: TFunction;
  onAuth: (user: AuthUser) => void;
}

export function AuthScreen({ t, onAuth }: AuthScreenProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setError("E-Mail und Passwort sind erforderlich");
      return;
    }
    if (mode === "signup" && !name.trim()) {
      setError("Name ist erforderlich");
      return;
    }
    setLoading(true);
    try {
      const result =
        mode === "signin"
          ? await signInWithPassword(trimmedEmail, password)
          : await signUp(trimmedEmail, password, name.trim());
      onAuth({
        email: result.user.email,
        name: result.user.name,
        initials: result.user.initials || initialsFromName(result.user.name),
        token: result.token,
        role: result.user.role,
      });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Anmeldung fehlgeschlagen";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="app-bg auth-grid"
      style={{ minHeight: "100vh", display: "grid", gridTemplateColumns: "1.05fr 1fr" }}
    >
      <div
        className="auth-brand"
        style={{
          position: "relative",
          padding: "44px 48px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          borderRight: "1px solid var(--line)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, color-mix(in oklab, var(--accent) 18%, var(--surface-2)), var(--surface)), radial-gradient(ellipse at 70% 30%, color-mix(in oklab, var(--accent) 25%, transparent), transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(160deg, color-mix(in oklab, var(--bg) 72%, transparent), color-mix(in oklab, var(--bg) 94%, transparent))",
          }}
        />
        <div style={{ position: "relative" }}>
          <Logo size={24} href="/" />
        </div>
        <div style={{ position: "relative", maxWidth: 440 }}>
          <div className="eyebrow" style={{ marginBottom: 18 }}>
            Padel Club · Est. 2024
          </div>
          <h1 className="display" style={{ fontSize: 52, margin: "0 0 18px", lineHeight: 1.04 }}>
            Zehn Plätze.
            <br />
            Ein Clubhaus.
            <br />
            <span style={{ color: "var(--accent)" }}>Dein Spiel.</span>
          </h1>
          <p style={{ color: "var(--ink-2)", fontSize: 16, lineHeight: 1.6, maxWidth: 380, margin: 0 }}>
            Reserviere Panorama-Courts, leih dir Premium-Schläger und sieh in Echtzeit, was frei ist — alles an einem Ort.
          </p>
        </div>
        <div style={{ position: "relative" }} className="row gap-4">
          <div className="row gap-2">
            <Icon name="pin" size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>Lindenhof · München</span>
          </div>
          <div className="row gap-2">
            <Icon name="clock" size={16} style={{ color: "var(--accent)" }} />
            <span style={{ fontSize: 13, color: "var(--ink-3)" }}>08–22 Uhr</span>
          </div>
        </div>
      </div>

      <div style={{ display: "grid", placeItems: "center", padding: 32 }}>
        <div className="view-in" style={{ width: "100%", maxWidth: 384 }}>
          <h2 className="display" style={{ fontSize: 30, margin: "0 0 6px" }}>
            {mode === "signin" ? t("signin") : t("signup")}
          </h2>
          <p className="muted" style={{ margin: "0 0 26px", fontSize: 14.5 }}>
            {mode === "signin" ? t("welcomeBack") : t("joinClub")}
          </p>
          <div className="col gap-3">
            {mode === "signup" && (
              <Field label={t("nameLabel")} placeholder="Nora Brandt" value={name} onChange={setName} />
            )}
            <Field label={t("emailLabel")} placeholder="nora@volea.club" type="email" value={email} onChange={setEmail} />
            <Field label={t("pwLabel")} placeholder="••••••••" type="password" value={password} onChange={setPassword} />
          </div>
          {error && (
            <p style={{ color: "var(--busy)", fontSize: 13, margin: "12px 0 0" }}>{error}</p>
          )}
          <div style={{ height: 18 }} />
          <Button size="lg" full onClick={handleAuth} iconRight="arrowR" disabled={loading}>
            {loading ? t("processing") : mode === "signin" ? t("signin") : t("signup")}
          </Button>
          <div className="row gap-3" style={{ margin: "22px 0", color: "var(--ink-faint)", fontSize: 12 }}>
            <div style={{ height: 1, background: "var(--line)", flex: 1 }} />
            <span style={{ letterSpacing: "0.08em" }}>{t("orContinue")}</span>
            <div style={{ height: 1, background: "var(--line)", flex: 1 }} />
          </div>
          <div className="row gap-3">
            <Button variant="soft" full disabled>
              Apple
            </Button>
            <Button variant="soft" full disabled>
              Google
            </Button>
          </div>
          <p style={{ textAlign: "center", marginTop: 10, fontSize: 12, color: "var(--ink-faint)" }}>
            Social-Login folgt — bitte E-Mail und Passwort nutzen.
          </p>
          <p style={{ textAlign: "center", marginTop: 26, fontSize: 14, color: "var(--ink-3)" }}>
            {mode === "signin" ? t("noAccount") : t("haveAccount")}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              style={{
                background: "none",
                border: "none",
                color: "var(--accent)",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                fontFamily: "var(--font-ui)",
              }}
            >
              {mode === "signin" ? t("signup") : t("signin")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
