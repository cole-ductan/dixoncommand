import { create } from "zustand";

type State = {
  open: boolean;
  view: "compose" | "saved";
  draftTitle: string;
  draftBody: string;
  setOpen: (v: boolean) => void;
  setView: (v: "compose" | "saved") => void;
  setDraftTitle: (v: string) => void;
  setDraftBody: (v: string) => void;
  resetDraft: () => void;
  toggle: () => void;
};

export const useNotesUi = create<State>((set) => ({
  open: false,
  view: "compose",
  draftTitle: "",
  draftBody: "",
  setOpen: (v) => set({ open: v }),
  setView: (v) => set({ view: v }),
  setDraftTitle: (v) => set({ draftTitle: v }),
  setDraftBody: (v) => set({ draftBody: v }),
  resetDraft: () => set({ draftTitle: "", draftBody: "" }),
  toggle: () => set((s) => ({ open: !s.open })),
}));
