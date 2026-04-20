import { create } from "zustand";

export type TrayItem =
  | { kind: "pdf"; id: string; name: string; driveFileId: string; driveUrl: string }
  | { kind: "offer"; id: string; name: string; details: string }
  | { kind: "template"; id: string; name: string; subject: string; body: string };

type State = {
  items: TrayItem[];
  to: string;
  subject: string;
  body: string;
  open: boolean;
  add: (item: TrayItem) => void;
  remove: (id: string, kind: TrayItem["kind"]) => void;
  clear: () => void;
  setTo: (v: string) => void;
  setSubject: (v: string) => void;
  setBody: (v: string) => void;
  setOpen: (v: boolean) => void;
  toggle: () => void;
};

export const usePendingTray = create<State>((set, get) => ({
  items: [],
  to: "",
  subject: "",
  body: "",
  open: false,
  add: (item) => {
    const exists = get().items.some((i) => i.kind === item.kind && i.id === item.id);
    if (exists) return;
    set((s) => ({ items: [...s.items, item], open: true }));
  },
  remove: (id, kind) => set((s) => ({ items: s.items.filter((i) => !(i.id === id && i.kind === kind)) })),
  clear: () => set({ items: [], subject: "", body: "" }),
  setTo: (v) => set({ to: v }),
  setSubject: (v) => set({ subject: v }),
  setBody: (v) => set({ body: v }),
  setOpen: (v) => set({ open: v }),
  toggle: () => set((s) => ({ open: !s.open })),
}));

/** Build a Gmail web compose URL */
export function buildGmailComposeUrl(opts: {
  to: string;
  subject: string;
  body: string;
}) {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    to: opts.to,
    su: opts.subject,
    body: opts.body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
