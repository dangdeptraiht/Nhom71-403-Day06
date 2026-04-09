import { create } from 'zustand';

interface SessionState {
  selectedPapers: any[];
  setPapers: (papers: any[]) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  selectedPapers: [],
  setPapers: (papers) => set({ selectedPapers: papers }),
}));
