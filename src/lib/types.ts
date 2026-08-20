export type CourtType = "panorama" | "indoor" | "outdoor";
export type CourtMode = "Doppel" | "Einzel";
export type SlotState = "free" | "booked" | "mine";
export type EquipmentCategory = "racket" | "ball" | "shoe" | "extra";
export type Role = "player" | "admin";
export type Lang = "de" | "en";
export type Theme = "dark" | "light";
export type AccentKey = "brass" | "clay" | "green" | "slate";
export type FontKey = "classic" | "editorial" | "modern";
export type DensityKey = "compact" | "regular" | "comfy";

export interface Court {
  id: number;
  name: string;
  type: CourtType;
  indoor: boolean;
  mode: CourtMode;
  price: number;
}

export interface SlotCell {
  state: SlotState;
  who?: string;
  slot: number;
}

export interface Equipment {
  id: string;
  cat: EquipmentCategory;
  name: string;
  tag: string;
  price: number;
  perDay: boolean;
  stock: number;
  blurb: string;
}

export interface Booking {
  id: string;
  court: number;
  date: string;
  slot: number;
  slots?: number[];
  time: string;
  players: number;
  gear: string[];
  price: number;
  status: string;
  shared?: boolean;
  sharedWith?: string[];
  sharePrice?: number;
}

export interface Friend {
  id: string;
  name: string;
  initials: string;
  level: string;
  email: string;
}

export interface SharedBookingParticipant {
  friendId: string;
  name: string;
  initials: string;
  status: "pending" | "confirmed";
  share: number;
}

export interface SharedBooking {
  id: string;
  court: number;
  date: string;
  slot: number;
  time: string;
  totalPrice: number;
  gear: string[];
  organizerName: string;
  organizerEmail: string;
  participants: SharedBookingParticipant[];
  status: "awaiting" | "confirmed" | "cancelled";
}

export interface WeekDay {
  d: string;
  court: number;
  gear: number;
}

export interface FeedItem {
  who: string;
  act: string;
  amt: number;
  ago: string;
  gear: boolean;
}

export interface UserProfile {
  name: string;
  initials: string;
  member: string;
  since: string;
  credit: number;
  level: string;
  email: string;
  monthlyQuota: number;
  monthlyUsed: number;
}

export interface AuthUser {
  email: string;
  name: string;
  initials: string;
  token: string;
  role: Role;
}

export interface SlotSelection {
  courtId: number;
  slots: number[];
}

export type Cart = Record<string, number>;

export interface BookingSheetState {
  open: boolean;
  court: Court | null;
  slots: number[];
  date: string;
}

export type PlayerView = "home" | "equipment" | "account" | "bookings" | "friends";
export type AdminView = "overview" | "bookings" | "courts";
export type AppView = PlayerView | AdminView;
