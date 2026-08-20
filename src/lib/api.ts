import type { AuthUser, Booking, Court, Equipment, Role, SlotCell, UserProfile } from "@/lib/types";
import { COURTS, EQUIPMENT, HOURS, MONTHLY_QUOTA, initialsFromName } from "@/lib/data";

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function errorMessage(detail: unknown, fallback: string): string {
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  if (detail && typeof detail === "object" && "message" in detail) {
    return String((detail as { message: unknown }).message);
  }
  return fallback;
}

async function api<T>(path: string, init: RequestInit = {}, token?: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { ...init, headers });
  if (!response.ok) {
    let detail: unknown = response.statusText;
    try {
      const body = (await response.json()) as { detail?: unknown };
      detail = body.detail ?? body;
    } catch {
      /* ignore */
    }
    throw new ApiError(response.status, errorMessage(detail, response.statusText || "request failed"));
  }
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export interface ApiUser {
  id: string;
  email: string;
  name: string;
  initials: string;
  member: string;
  since: string;
  credit: number;
  level: string;
  role: Role;
  monthlyQuota: number;
  monthlyUsed: number;
}

interface AuthResponse {
  token: string;
  user: ApiUser;
}

export function authUserFromApi(token: string, user: ApiUser): AuthUser {
  return {
    email: user.email,
    name: user.name,
    initials: user.initials || initialsFromName(user.name),
    token,
    role: user.role,
  };
}

export function profileFromApi(user: ApiUser, email: string): UserProfile {
  return {
    name: user.name,
    initials: user.initials || initialsFromName(user.name),
    member: user.member,
    since: user.since,
    credit: user.credit,
    level: user.level,
    email,
    monthlyQuota: user.monthlyQuota ?? MONTHLY_QUOTA,
    monthlyUsed: user.monthlyUsed ?? 0,
  };
}

export async function signInWithPassword(email: string, password: string) {
  const data = await api<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  return { ok: true as const, token: data.token, user: data.user };
}

export async function signUp(email: string, password: string, name: string) {
  const data = await api<AuthResponse>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
  return { ok: true as const, token: data.token, user: data.user };
}

export async function signOut(token: string) {
  try {
    await api("/auth/logout", { method: "POST" }, token);
  } catch {
    /* session already gone */
  }
}

export async function fetchMe(token: string): Promise<ApiUser> {
  return api<ApiUser>("/auth/me", {}, token);
}

export async function fetchCourts(): Promise<Court[]> {
  try {
    const data = await api<Court[]>("/courts");
    return data?.length ? data : COURTS;
  } catch {
    return COURTS;
  }
}

export async function fetchEquipment(): Promise<Equipment[]> {
  try {
    const data = await api<Equipment[]>("/equipment");
    return data?.length ? data : EQUIPMENT;
  } catch {
    return EQUIPMENT;
  }
}

export function emptyGrid(courts: Court[] = COURTS): Record<number, SlotCell[]> {
  const grid: Record<number, SlotCell[]> = {};
  for (const court of courts) {
    grid[court.id] = HOURS.map((_, slot) => ({ state: "free" as const, slot }));
  }
  return grid;
}

export async function fetchOccupancyGrid(
  date: string,
  token?: string | null,
): Promise<Record<number, SlotCell[]>> {
  const data = await api<{
    courts: { id: number; slots: SlotCell[] }[];
  }>(`/occupancy?date=${encodeURIComponent(date)}`, {}, token);
  const grid = emptyGrid();
  for (const court of data.courts ?? []) {
    grid[court.id] = court.slots.map((cell, index) => ({
      state: cell.state,
      who: cell.who,
      slot: cell.slot ?? index,
    }));
  }
  return grid;
}

export async function fetchMyBookings(token: string): Promise<Booking[]> {
  return api<Booking[]>("/bookings", {}, token);
}

export async function createBooking(
  token: string,
  payload: {
    court_id: number;
    booking_date: string;
    slots: number[];
    players: number;
    gear: { id: string; qty: number }[];
  },
): Promise<Booking> {
  return api<Booking>(
    "/bookings",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    token,
  );
}

export async function cancelBooking(token: string, id: string): Promise<void> {
  await api(`/bookings/${id}`, { method: "DELETE" }, token);
}

export function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
