import { create } from 'zustand';

/**
 * Just the current mosque ID — resolved once by app/index.tsx (offline-first, see
 * data/sync-mosque.ts) and read by every other screen that needs to scope a request.
 * Not a mosque switcher; there's exactly one until Plan 3's sync makes multi-tenant
 * local storage real (same boundary Phase 2B drew for local SQLite).
 */
type MosqueState = {
  currentMosqueId: string | null;
  setCurrentMosqueId: (id: string | null) => void;
};

export const useMosque = create<MosqueState>((set) => ({
  currentMosqueId: null,
  setCurrentMosqueId: (id) => set({ currentMosqueId: id }),
}));
