import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  StickyNote, X, Save, Trash2, Pin, PinOff, Calendar as CalIcon, Plus, Search,
} from "lucide-react";
import { useNotesUi } from "@/lib/notesStore";
import { DateTimePicker } from "@/components/DateTimePicker";
import { NextActionPicker } from "@/components/NextActionPicker";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { openGCal } from "@/lib/gcal";

type Note = {
  id: string;
  title: string | null;
  body: string;
  pinned: boolean;
  reminder_at: string | null;
  task_id: string | null;
  created_at: string;
  updated_at: string;
};

export function NotesTray() {
  const { user } = useAuth();
  const { open, view, draftTitle, draftBody, setOpen, setView, setDraftTitle, setDraftBody, resetDraft } = useNotesUi();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // Calendar-saving state per draft
  const [saveToCalendar, setSaveToCalendar] = useState(false);
  const [reminderAt, setReminderAt] = useState("");
  const [reminderAction, setReminderAction] = useState("");

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("notes")
      .select("*")
      .order("pinned", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(200);
    setNotes((data ?? []) as Note[]);
    setLoading(false);
  };

  useEffect(() => {
    if (open && user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const saveNote = async () => {
    if (!user) return;
    if (!draftTitle.trim() && !draftBody.trim()) {
      toast.error("Add a title or body first");
      return;
    }

    let taskId: string | null = null;
    if (saveToCalendar && reminderAt && reminderAction) {
      const { data: t, error: tErr } = await supabase
        .from("tasks")
        .insert({
          user_id: user.id,
          next_action: reminderAction,
          next_action_at: new Date(reminderAt).toISOString(),
        })
        .select("id")
        .single();
      if (tErr) {
        toast.error("Calendar save failed: " + tErr.message);
        return;
      }
      taskId = t.id;
    }

    const { error } = await supabase.from("notes").insert({
      user_id: user.id,
      title: draftTitle.trim() || null,
      body: draftBody.trim(),
      reminder_at: saveToCalendar && reminderAt ? new Date(reminderAt).toISOString() : null,
      task_id: taskId,
    });

    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    toast.success(taskId ? "Note saved + added to calendar" : "Note saved");
    resetDraft();
    setSaveToCalendar(false);
    setReminderAt("");
    setReminderAction("");
    await load();
    setView("saved");
  };

  const togglePin = async (id: string, pinned: boolean) => {
    await supabase.from("notes").update({ pinned: !pinned }).eq("id", id);
    await load();
  };

  const deleteNote = async (id: string) => {
    await supabase.from("notes").delete().eq("id", id);
    await load();
  };

  const addExistingToCalendar = async (note: Note) => {
    if (!user) return;
    const action = note.title?.trim() || note.body.split("\n")[0]?.slice(0, 80) || "Follow up";
    // Default to tomorrow 9am
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);

    const { data: t, error } = await supabase
      .from("tasks")
      .insert({
        user_id: user.id,
        next_action: action,
        next_action_at: d.toISOString(),
      })
      .select("id")
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    await supabase.from("notes").update({ task_id: t.id, reminder_at: d.toISOString() }).eq("id", note.id);
    toast.success("Added to calendar (tomorrow 9am) — edit in Follow-Ups");
    await load();
  };

  const filtered = notes.filter((n) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (n.title ?? "").toLowerCase().includes(s) || n.body.toLowerCase().includes(s);
  });

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full bg-secondary text-foreground border shadow-lg px-4 py-2.5 hover:bg-background"
        aria-label="Open notes"
      >
        <StickyNote className="h-4 w-4" />
        <span className="text-sm font-medium">Notes</span>
        {notes.length > 0 && (
          <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-mono">
            {notes.length}
          </span>
        )}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-50 w-[min(420px,calc(100vw-2rem))] rounded-xl border bg-card shadow-2xl flex flex-col max-h-[80vh]">
      <div className="flex items-center justify-between border-b px-4 py-2.5">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" />
          <span className="font-display text-sm font-semibold">Notes</span>
        </div>
        <button onClick={() => setOpen(false)} className="rounded p-1 hover:bg-secondary">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* tabs */}
      <div className="border-b flex">
        <button
          onClick={() => setView("compose")}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition",
            view === "compose" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Plus className="inline-block mr-1 h-3 w-3" /> New note
        </button>
        <button
          onClick={() => setView("saved")}
          className={cn(
            "flex-1 px-3 py-2 text-xs font-medium transition",
            view === "saved" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          Saved ({notes.length})
        </button>
      </div>

      {view === "compose" ? (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-3">
            <Input
              placeholder="Title (optional)"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="h-8 text-sm font-medium"
            />
            <Textarea
              placeholder="Quick note, idea, reminder…"
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={6}
              className="text-sm"
            />

            <div className="rounded-md border bg-secondary/30 p-2.5 space-y-2">
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={saveToCalendar}
                  onChange={(e) => setSaveToCalendar(e.target.checked)}
                />
                <CalIcon className="h-3 w-3" />
                Also save to calendar as a follow-up
              </label>
              {saveToCalendar && (
                <div className="space-y-2 pt-1">
                  <NextActionPicker value={reminderAction} onChange={setReminderAction} />
                  <DateTimePicker value={reminderAt} onChange={setReminderAt} />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs"
                    disabled={!reminderAt || !reminderAction}
                    onClick={() =>
                      openGCal({
                        title: reminderAction || draftTitle || "Note reminder",
                        details: [draftTitle, draftBody].filter(Boolean).join("\n\n"),
                        start: new Date(reminderAt),
                      })
                    }
                  >
                    <CalIcon className="mr-1 h-3 w-3" /> Add to Google Calendar
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      ) : (
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Search notes…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 text-xs pl-7"
              />
            </div>
            {loading && <div className="text-xs text-muted-foreground p-2">Loading…</div>}
            {!loading && filtered.length === 0 && (
              <div className="text-xs text-muted-foreground p-3 text-center">
                No notes yet. Switch to "New note" to write one.
              </div>
            )}
            {filtered.map((n) => (
              <article key={n.id} className="rounded-md border bg-card p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {n.title && <div className="font-medium text-sm truncate">{n.title}</div>}
                    <div className="text-[10px] font-mono text-muted-foreground">
                      {format(new Date(n.updated_at), "MMM d · h:mm a")}
                      {n.reminder_at && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded bg-primary/10 px-1 py-0.5 text-primary">
                          <CalIcon className="h-2.5 w-2.5" />
                          {format(new Date(n.reminder_at), "MMM d · h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => togglePin(n.id, n.pinned)}
                      className="rounded p-1 hover:bg-secondary"
                      title={n.pinned ? "Unpin" : "Pin"}
                    >
                      {n.pinned ? <Pin className="h-3.5 w-3.5 text-primary" /> : <PinOff className="h-3.5 w-3.5 text-muted-foreground" />}
                    </button>
                    <button
                      onClick={() =>
                        openGCal({
                          title: n.title || n.body.split("\n")[0]?.slice(0, 80) || "Note reminder",
                          details: n.body,
                          start: n.reminder_at ? new Date(n.reminder_at) : (() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; })(),
                        })
                      }
                      className="rounded p-1 hover:bg-secondary"
                      title="Add to Google Calendar"
                    >
                      <CalIcon className="h-3.5 w-3.5 text-primary" />
                    </button>
                    {!n.task_id && (
                      <button
                        onClick={() => addExistingToCalendar(n)}
                        className="rounded p-1 hover:bg-secondary"
                        title="Save as in-app follow-up (tomorrow 9am)"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteNote(n.id)}
                      className="rounded p-1 hover:bg-destructive/10 text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {n.body && (
                  <pre className="whitespace-pre-wrap font-sans text-xs text-foreground/80 leading-relaxed">
                    {n.body}
                  </pre>
                )}
              </article>
            ))}
          </div>
        </ScrollArea>
      )}

      {view === "compose" && (
        <div className="border-t p-3 flex gap-2">
          <Button size="sm" variant="outline" onClick={resetDraft}>
            <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
          </Button>
          <Button size="sm" className="flex-1" onClick={saveNote}>
            <Save className="mr-1.5 h-3.5 w-3.5" /> Save note
          </Button>
        </div>
      )}
    </div>
  );
}

/** Floating helper button for opening the saved tab directly. Optional secondary CTA. */
export function NotesSavedShortcut() {
  const { open, setOpen, setView } = useNotesUi();
  if (open) return null;
  return (
    <button
      onClick={() => {
        setView("saved");
        setOpen(true);
      }}
      className="fixed bottom-4 left-[calc(1rem+92px)] z-50 flex items-center gap-1.5 rounded-full bg-card border shadow-md px-3 py-2 text-xs hover:bg-secondary"
      aria-label="Open saved notes"
    >
      <Search className="h-3 w-3" /> Saved
    </button>
  );
}
