import type { AuthUser } from "./types";

const SESSION_KEY = "volea_session";

export function saveSession(user: AuthUser): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    /* ignore quota errors */
  }
}

export function loadSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed?.email || !parsed?.name || !parsed?.token) return null;
    return {
      email: parsed.email,
      name: parsed.name,
      initials: parsed.initials || parsed.name.slice(0, 2).toUpperCase(),
      token: parsed.token,
      role: parsed.role === "admin" ? "admin" : "player",
    };
  } catch {
    return null;
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}
