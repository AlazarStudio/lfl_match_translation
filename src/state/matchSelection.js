import { create } from "zustand";

export const useMatchSelection = create((set) => ({
  selectedMatchId: null,
  setSelectedMatchId: (id) => set({ selectedMatchId: id }),
}));
