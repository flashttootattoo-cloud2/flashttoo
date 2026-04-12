import { create } from "zustand";
import type { Profile } from "@/types/database";
import type { User } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  profile: Profile | null;
  unreadCount: number;
  notifCount: number;
  setUser: (user: User | null) => void;
  setProfile: (profile: Profile | null) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
  incrementNotif: () => void;
  setNotifCount: (n: number) => void;
  clearNotif: () => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  unreadCount: 0,
  notifCount: 0,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  clearUnread: () => set({ unreadCount: 0 }),
  incrementNotif: () => set((s) => ({ notifCount: s.notifCount + 1 })),
  setNotifCount: (n) => set({ notifCount: n }),
  clearNotif: () => set({ notifCount: 0 }),
  clear: () => set({ user: null, profile: null, unreadCount: 0, notifCount: 0 }),
}));
