import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Folder, FolderPlus, StickyNote, Plus, Pin, PinOff, Trash2, Search,
  MoreHorizontal, Inbox, Save, X, Pencil, FolderOpen, Calendar as CalIcon,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/notes")({
  component: NotesPage,
  head: () => ({
    meta: [
      { title: "Notes — Dixon Command Center" },
      { name: "description", content: "Capture, organize, and find your notes by folder." },
    ],
  }),
});

type Folder = {
  id: string;
  name: string;
  color: string | null;
  sort_order: number;
};

type Note = {
  id: string;
  title: string | null;
  body: string;
  pinned: boolean;
  reminder_at: string | null;
  task_id: string | null;
  folder_id: string | null;
  created_at: string;
  updated_at: string;
};

const FOLDER_COLORS = [
  { name: "Slate", value: "slate" },
  { name: "Sky", value: "sky" },
  { name: "Emerald", value: "emerald" },
  { name: "Amber", value: "amber" },
  { name: "Rose", value: "rose" },
  { name: "Violet", value: "violet" },
];

const COLOR_DOT: Record<string, string> = {
  slate: "bg-slate-400",
  sky: "bg-sky-400",
  emerald: "bg-emerald-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  violet: "bg-violet-400",
};

const ALL = "__all__";
const UNCAT = "__uncat__";

function NotesPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeFolder, setActiveFolder] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // New note composer
  const [composerOpen, setComposerOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftBody, setDraftBody] = useState("");
  const [draftFolder, setDraftFolder] = useState<string | null>(null);

  // Folder dialog
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderColor, setFolderColor] = useState("slate");

  const loadAll = async () => {
    if (!user) return;
    setLoading(true);
    const [f, n] = await Promise.all([
      supabase.from("note_folders").select("*").order("sort_order").order("name"),
      supabase
        .from("notes")
        .select("*")
        .order("pinned", { ascending: false })
        .order("updated_at", { ascending: false })
        .limit(500),
    ]);
    setFolders((f.data ?? []) as Folder[]);
    setNotes((n.data ?? []) as Note[]);
    setLoading(false);
  };

  useEffect(() => {
    if (user) void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { [ALL]: notes.length, [UNCAT]: 0 };
    for (const n of notes) {
      if (!n.folder_id) m[UNCAT]++;
      else m[n.folder_id] = (m[n.folder_id] ?? 0) + 1;
    }
    return m;
  }, [notes]);

  const filtered = useMemo(() => {
    let list = notes;
    if (activeFolder === UNCAT) list = list.filter((n) => !n.folder_id);
    else if (activeFolder !== ALL) list = list.filter((n) => n.folder_id === activeFolder);
    if (search.trim()) {
      const s = search.toLowerCase();
      list = list.filter(
        (n) => (n.title ?? "").toLowerCase().includes(s) || n.body.toLowerCase().includes(s),
      );
    }
    return list;
  }, [notes, activeFolder, search]);

  const openNewFolder = () => {
    setEditingFolder(null);
    setFolderName("");
    setFolderColor("slate");
    setFolderDialogOpen(true);
  };
  const openEditFolder = (f: Folder) => {
    setEditingFolder(f);
    setFolderName(f.name);
    setFolderColor(f.color ?? "slate");
    setFolderDialogOpen(true);
  };

  const saveFolder = async () => {
    if (!user || !folderName.trim()) {
      toast.error("Folder name is required");
      return;
    }
    if (editingFolder) {
      const { error } = await supabase
        .from("note_folders")
        .update({ name: folderName.trim(), color: folderColor })
        .eq("id", editingFolder.id);
      if (error) return toast.error(error.message);
      toast.success("Folder updated");
    } else {
      const { error } = await supabase.from("note_folders").insert({
        user_id: user.id,
        name: folderName.trim(),
        color: folderColor,
        sort_order: folders.length,
      });
      if (error) return toast.error(error.message);
      toast.success("Folder created");
    }
    setFolderDialogOpen(false);
    await loadAll();
  };

  const deleteFolder = async (f: Folder) => {
    if (!confirm(`Delete folder "${f.name}"? Notes inside will become Uncategorized.`)) return;
    const { error } = await supabase.from("note_folders").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    if (activeFolder === f.id) setActiveFolder(ALL);
    toast.success("Folder deleted");
    await loadAll();
  };

  const openComposer = () => {
    setDraftTitle("");
    setDraftBody("");
    setDraftFolder(activeFolder !== ALL && activeFolder !== UNCAT ? activeFolder : null);
    setComposerOpen(true);
  };

  const saveNewNote = async () => {
    if (!user) return;
    if (!draftTitle.trim() && !draftBody.trim()) {
      toast.error("Add a title or body first");
      return;
    }
    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: draftTitle.trim() || null,
      body: draftBody.trim(),
      folder_id: draftFolder,
    });
    if (error) return toast.error(error.message);
    toast.success("Note saved");
    setComposerOpen(false);
    await loadAll();
  };

  const togglePin = async (n: Note) => {
    await supabase.from("notes").update({ pinned: !n.pinned }).eq("id", n.id);
    await loadAll();
  };

  const moveNote = async (n: Note, folderId: string | null) => {
    await supabase.from("notes").update({ folder_id: folderId }).eq("id", n.id);
    await loadAll();
  };

  const deleteNote = async (n: Note) => {
    if (!confirm("Delete this note?")) return;
    await supabase.from("notes").delete().eq("id", n.id);
    await loadAll();
  };

  const folderLabel = (id: string | null | undefined) =>
    id ? folders.find((f) => f.id === id)?.name ?? "—" : "Uncategorized";

  const folderColorOf = (id: string | null | undefined) =>
    id ? folders.find((f) => f.id === id)?.color ?? "slate" : "slate";

  return (
    <div className="flex h-[calc(100vh-49px)] min-h-0">
      {/* Sidebar — folders */}
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r bg-card/50">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <Folder className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-display text-sm font-semibold">Folders</h2>
          </div>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={openNewFolder} title="New folder">
            <FolderPlus className="h-4 w-4" />
          </Button>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <nav className="p-2 space-y-0.5">
            <FolderRow
              active={activeFolder === ALL}
              onClick={() => setActiveFolder(ALL)}
              icon={<StickyNote className="h-3.5 w-3.5" />}
              label="All notes"
              count={counts[ALL] ?? 0}
            />
            <FolderRow
              active={activeFolder === UNCAT}
              onClick={() => setActiveFolder(UNCAT)}
              icon={<Inbox className="h-3.5 w-3.5" />}
              label="Uncategorized"
              count={counts[UNCAT] ?? 0}
            />
            <div className="my-2 border-t" />
            {folders.length === 0 && (
              <p className="px-3 py-4 text-xs text-muted-foreground">
                No folders yet. Create one to organize your notes.
              </p>
            )}
            {folders.map((f) => (
              <div key={f.id} className="group relative">
                <FolderRow
                  active={activeFolder === f.id}
                  onClick={() => setActiveFolder(f.id)}
                  icon={<span className={cn("h-2.5 w-2.5 rounded-full", COLOR_DOT[f.color ?? "slate"])} />}
                  label={f.name}
                  count={counts[f.id] ?? 0}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1 opacity-0 group-hover:opacity-100 hover:bg-secondary"
                      aria-label="Folder actions"
                    >
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditFolder(f)}>
                      <Pencil className="mr-2 h-3.5 w-3.5" /> Rename / recolor
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => deleteFolder(f)} className="text-destructive">
                      <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </nav>
        </ScrollArea>
      </aside>

      {/* Main content */}
      <section className="flex-1 min-w-0 flex flex-col">
        <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3">
          {/* Mobile folder picker */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="h-8">
                  <FolderOpen className="mr-1.5 h-3.5 w-3.5" />
                  {activeFolder === ALL
                    ? "All notes"
                    : activeFolder === UNCAT
                      ? "Uncategorized"
                      : folders.find((f) => f.id === activeFolder)?.name ?? "Folder"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => setActiveFolder(ALL)}>All notes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setActiveFolder(UNCAT)}>Uncategorized</DropdownMenuItem>
                {folders.map((f) => (
                  <DropdownMenuItem key={f.id} onClick={() => setActiveFolder(f.id)}>
                    <span className={cn("mr-2 h-2 w-2 rounded-full", COLOR_DOT[f.color ?? "slate"])} />
                    {f.name}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuItem onClick={openNewFolder}>
                  <FolderPlus className="mr-2 h-3.5 w-3.5" /> New folder
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <h1 className="font-display text-lg font-semibold">
              {activeFolder === ALL
                ? "All notes"
                : activeFolder === UNCAT
                  ? "Uncategorized"
                  : folders.find((f) => f.id === activeFolder)?.name ?? "Notes"}
            </h1>
            <p className="text-xs text-muted-foreground">{filtered.length} note{filtered.length === 1 ? "" : "s"}</p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-7 w-[180px] sm:w-[240px] text-sm"
              />
            </div>
            <Button size="sm" variant="outline" className="md:hidden h-8" onClick={openNewFolder}>
              <FolderPlus className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" className="h-8" onClick={openComposer}>
              <Plus className="mr-1 h-3.5 w-3.5" /> New note
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4">
            {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
            {!loading && filtered.length === 0 && (
              <div className="rounded-xl border-2 border-dashed bg-secondary/20 p-10 text-center">
                <StickyNote className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-base font-semibold">No notes here yet</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {search ? "Nothing matches your search." : "Click “New note” to capture your first one."}
                </p>
                {!search && (
                  <Button size="sm" className="mt-4" onClick={openComposer}>
                    <Plus className="mr-1 h-3.5 w-3.5" /> New note
                  </Button>
                )}
              </div>
            )}
            {!loading && filtered.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((n) => (
                  <NoteCard
                    key={n.id}
                    note={n}
                    folderName={folderLabel(n.folder_id)}
                    folderColor={folderColorOf(n.folder_id)}
                    folders={folders}
                    onTogglePin={() => togglePin(n)}
                    onMove={(fid) => moveNote(n, fid)}
                    onDelete={() => deleteNote(n)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </section>

      {/* New note dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title (optional)"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="font-medium"
              autoFocus
            />
            <Textarea
              placeholder="Write your note…"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={8}
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Folder:</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8">
                    <span
                      className={cn(
                        "mr-2 h-2 w-2 rounded-full",
                        COLOR_DOT[folderColorOf(draftFolder)],
                      )}
                    />
                    {folderLabel(draftFolder)}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => setDraftFolder(null)}>
                    <Inbox className="mr-2 h-3.5 w-3.5" /> Uncategorized
                  </DropdownMenuItem>
                  {folders.map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => setDraftFolder(f.id)}>
                      <span className={cn("mr-2 h-2 w-2 rounded-full", COLOR_DOT[f.color ?? "slate"])} />
                      {f.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>
              <X className="mr-1.5 h-3.5 w-3.5" /> Cancel
            </Button>
            <Button onClick={saveNewNote}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> Save note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Folder dialog */}
      <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingFolder ? "Edit folder" : "New folder"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Folder name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
            />
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Color</p>
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFolderColor(c.value)}
                    className={cn(
                      "h-7 w-7 rounded-full border-2 transition",
                      COLOR_DOT[c.value],
                      folderColor === c.value ? "border-foreground scale-110" : "border-transparent",
                    )}
                    title={c.name}
                    aria-label={c.name}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setFolderDialogOpen(false)}>Cancel</Button>
            <Button onClick={saveFolder}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> {editingFolder ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FolderRow({
  active, onClick, icon, label, count,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; count: number }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition",
        active ? "bg-secondary text-foreground font-medium" : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
      )}
    >
      <span className="flex h-4 w-4 items-center justify-center">{icon}</span>
      <span className="flex-1 text-left truncate">{label}</span>
      <span className="text-[10px] font-mono text-muted-foreground">{count}</span>
    </button>
  );
}

function NoteCard({
  note, folderName, folderColor, folders, onTogglePin, onMove, onDelete,
}: {
  note: Note;
  folderName: string;
  folderColor: string;
  folders: Folder[];
  onTogglePin: () => void;
  onMove: (folderId: string | null) => void;
  onDelete: () => void;
}) {
  return (
    <article className="rounded-lg border bg-card p-3 space-y-2 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          {note.title && <h3 className="font-medium text-sm truncate">{note.title}</h3>}
          <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
            <span className="inline-flex items-center gap-1 rounded bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium">
              <span className={cn("h-1.5 w-1.5 rounded-full", COLOR_DOT[folderColor])} />
              {folderName}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">
              {format(new Date(note.updated_at), "MMM d · h:mm a")}
            </span>
            {note.reminder_at && (
              <span className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                <CalIcon className="h-2.5 w-2.5" />
                {format(new Date(note.reminder_at), "MMM d")}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={onTogglePin}
            className="rounded p-1 hover:bg-secondary"
            title={note.pinned ? "Unpin" : "Pin"}
          >
            {note.pinned ? <Pin className="h-3.5 w-3.5 text-primary" /> : <PinOff className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded p-1 hover:bg-secondary" aria-label="Note actions">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMove(null)}>
                <Inbox className="mr-2 h-3.5 w-3.5" /> Move to Uncategorized
              </DropdownMenuItem>
              {folders.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => onMove(f.id)}>
                  <span className={cn("mr-2 h-2 w-2 rounded-full", COLOR_DOT[f.color ?? "slate"])} />
                  Move to {f.name}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {note.body && (
        <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/80 leading-relaxed line-clamp-6">
          {note.body}
        </pre>
      )}
    </article>
  );
}