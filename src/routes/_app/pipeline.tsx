import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors,
  useDraggable, useDroppable,
} from "@dnd-kit/core";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, type Stage, stageLabel } from "@/lib/stages";
import { StageChip } from "@/components/StageChip";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Phone, Calendar, Flame, MapPin, Users, ExternalLink, DollarSign, HelpCircle, Trash2, Archive, ArchiveRestore } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/pipeline")({
  component: PipelinePage,
});

type EventCard = {
  id: string;
  event_name: string;
  stage: Stage;
  course: string | null;
  event_date: string | null;
  hot_lead: boolean;
  player_count: number | null;
  entry_fee: number | null;
  where_left_off: string | null;
  notes: string | null;
  archived: boolean;
};

// Stage groups
type GroupId = "active" | "in_progress" | "closed";
const GROUPS: { id: GroupId; label: string; stages: Stage[]; tooltip?: string }[] = [
  {
    id: "active",
    label: "Active",
    stages: ["new_lead", "contacted", "left_voicemail", "call_back_needed"],
  },
  {
    id: "in_progress",
    label: "In Progress",
    stages: ["pitch_delivered", "challenges_booked", "cgt_created", "proposal_sent", "follow_up_scheduled"],
  },
  {
    id: "closed",
    label: "Closed",
    stages: ["closed_won", "closed_lost"],
  },
];

// Tooltips for jargon stages
const STAGE_TOOLTIPS: Partial<Record<Stage, string>> = {
  cgt_created: "Charity Golf Today — the free tournament management platform created for the lead.",
  challenges_booked: "Par 3 (Dixon Challenge) and/or Par 5 (Aurelius Challenge) on-course games confirmed.",
  pitch_delivered: "Full pitch delivered — Amateur Endorsement, on-course games, CGT, and custom products.",
  proposal_sent: "Formal proposal / sponsorship doc sent — awaiting their decision.",
};

// Estimated value: entry_fee × player_count (or 0)
const cardValue = (c: EventCard) => (Number(c.entry_fee) || 0) * (Number(c.player_count) || 0);

function PipelinePage() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState<GroupId>("active");
  const [showArchived, setShowArchived] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("id,event_name,stage,course,event_date,hot_lead,player_count,entry_fee,where_left_off,notes,archived")
      .order("updated_at", { ascending: false });
    setEvents((data ?? []) as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handleDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const handleDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    if (!e.over) return;
    const id = String(e.active.id);
    const newStage = String(e.over.id) as Stage;
    const card = events.find((c) => c.id === id);
    if (!card || card.stage === newStage) return;
    setEvents((prev) => prev.map((c) => c.id === id ? { ...c, stage: newStage } : c));
    const { error } = await supabase.from("events").update({ stage: newStage }).eq("id", id);
    if (error) { toast.error("Update failed"); load(); }
    else toast.success(`Moved to ${stageLabel(newStage)}`);
  };

  const updateOpenField = async (patch: Partial<EventCard>) => {
    if (!openId) return;
    setEvents((prev) => prev.map((c) => c.id === openId ? { ...c, ...patch } as EventCard : c));
    const { error } = await supabase.from("events").update(patch as any).eq("id", openId);
    if (error) toast.error("Save failed: " + error.message);
  };

  const deleteOpen = async () => {
    if (!openId) return;
    const id = openId;
    const name = events.find((c) => c.id === id)?.event_name ?? "Event";
    setOpenId(null);
    setEvents((prev) => prev.filter((c) => c.id !== id));
    const { error } = await supabase.from("events").delete().eq("id", id);
    if (error) {
      toast.error("Delete failed: " + error.message);
      load();
    } else {
      toast.success(`Deleted "${name}"`);
    }
  };

  const archiveOpen = async () => {
    if (!openId) return;
    const card = events.find((c) => c.id === openId);
    if (!card) return;
    const newArchived = !card.archived;
    setEvents((prev) => prev.map((c) => c.id === openId ? { ...c, archived: newArchived } : c));
    const patch: any = { archived: newArchived, archived_at: newArchived ? new Date().toISOString() : null };
    const { error } = await supabase.from("events").update(patch).eq("id", openId);
    if (error) { toast.error("Archive failed: " + error.message); load(); }
    else toast.success(newArchived ? "Archived" : "Restored");
  };

  const active = activeId ? events.find((c) => c.id === activeId) : null;
  const open = openId ? events.find((c) => c.id === openId) : null;

  // Counts per group
  const groupCounts = useMemo(() => {
    const m: Record<GroupId, number> = { active: 0, in_progress: 0, closed: 0 };
    for (const e of events) {
      if (!showArchived && e.archived) continue;
      for (const g of GROUPS) {
        if (g.stages.includes(e.stage)) { m[g.id]++; break; }
      }
    }
    return m;
  }, [events, showArchived]);

  const visibleStages = GROUPS.find((g) => g.id === activeGroup)!.stages;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex min-h-[calc(100vh-88px)] md:h-[calc(100vh-1px)] flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-8 md:py-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-semibold">Pipeline</h1>
            <p className="text-xs text-muted-foreground">Drag cards across stages. Click to inspect & edit.</p>
          </div>
          <div className="flex items-center gap-3">
            <Tabs value={activeGroup} onValueChange={(v) => setActiveGroup(v as GroupId)}>
              <TabsList>
                {GROUPS.map((g) => (
                  <TabsTrigger key={g.id} value={g.id} className="gap-1.5">
                    {g.label}
                    <span className="rounded-full bg-secondary px-1.5 py-0 text-[10px] font-mono text-muted-foreground">
                      {groupCounts[g.id]}
                    </span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Button
              size="sm"
              variant={showArchived ? "default" : "outline"}
              onClick={() => setShowArchived((v) => !v)}
              title={showArchived ? "Hide archived" : "Show archived"}
            >
              <Archive className="mr-1.5 h-3.5 w-3.5" />
              {showArchived ? "Hiding archived" : "Show archived"}
            </Button>
            <AddLeadDialog onCreated={load} />
          </div>
        </header>

        {loading ? (
          <div className="flex-1 grid place-items-center text-muted-foreground">Loading…</div>
        ) : (
          <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex-1 min-h-0 overflow-x-auto">
              <div className="flex h-full gap-3 px-4 md:px-8 py-4 min-w-max">
                {visibleStages.map((s) => {
                  const items = events.filter((e) => e.stage === s && (showArchived || !e.archived));
                  return (
                    <Column key={s} stage={s} count={items.length}>
                      {items.map((card) => (
                        <DraggableCard key={card.id} card={card} onOpen={() => setOpenId(card.id)} />
                      ))}
                      {items.length === 0 && (
                        <div className="rounded-md border-2 border-dashed border-border/60 px-2 py-4 text-center text-[11px] text-muted-foreground">
                          Drop here
                        </div>
                      )}
                    </Column>
                  );
                })}
              </div>
            </div>
            <DragOverlay>
              {active && <PipelineCard card={active} dragging />}
            </DragOverlay>
          </DndContext>
        )}

        <Sheet open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
          <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
            {open && (
              <>
                <SheetHeader>
                  <SheetTitle className="font-display text-2xl pr-8">{open.event_name}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2"><StageChip stage={open.stage} /></SheetDescription>
                </SheetHeader>
                <div className="mt-6 space-y-4 text-sm">
                  {open.course && <Detail icon={<MapPin className="h-3.5 w-3.5" />} label="Course" value={open.course} />}
                  {open.event_date && <Detail icon={<Calendar className="h-3.5 w-3.5" />} label="Event date" value={format(new Date(open.event_date), "EEEE, MMMM d, yyyy")} />}

                  {/* Editable stage */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</Label>
                    <Select value={open.stage} onValueChange={(v) => updateOpenField({ stage: v as Stage })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STAGES.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Editable players & entry fee */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Players</Label>
                      <NumberField
                        value={open.player_count}
                        onSave={(v) => updateOpenField({ player_count: v })}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Entry fee</Label>
                      <NumberField
                        value={open.entry_fee}
                        onSave={(v) => updateOpenField({ entry_fee: v })}
                        prefix="$"
                      />
                    </div>
                  </div>
                  {cardValue(open) > 0 && (
                    <div className="text-xs text-muted-foreground">
                      Estimated value: <span className="font-mono text-foreground">${cardValue(open).toLocaleString()}</span>
                    </div>
                  )}

                  {/* Editable where we left off */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where we left off</Label>
                    <TextField
                      value={open.where_left_off ?? ""}
                      onSave={(v) => updateOpenField({ where_left_off: v || null })}
                      placeholder="What's the next move?"
                    />
                  </div>

                  {/* Editable notes */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</Label>
                    <TextField
                      value={open.notes ?? ""}
                      onSave={(v) => updateOpenField({ notes: v || null })}
                      placeholder="Anything you want to remember…"
                      rows={4}
                    />
                  </div>

                  <div className="pt-4 flex flex-wrap gap-2">
                    <Button asChild>
                      <Link to="/call" search={{ eventId: open.id }}><Phone className="mr-1.5 h-4 w-4" />Open in Call Workspace<ExternalLink className="ml-1 h-3 w-3" /></Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={archiveOpen}>
                      {open.archived ? (<><ArchiveRestore className="mr-1.5 h-4 w-4" />Restore</>) : (<><Archive className="mr-1.5 h-4 w-4" />Archive</>)}
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 className="mr-1.5 h-4 w-4" />Delete event
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete "{open.event_name}"?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This permanently removes the event and any related calls, emails, tasks, and notes linked to it. This cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={deleteOpen}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      </div>
    </TooltipProvider>
  );
}

function Detail({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5">{value}</div>
    </div>
  );
}

function TextField({
  value, onSave, placeholder, rows = 2,
}: { value: string; onSave: (v: string) => void; placeholder?: string; rows?: number }) {
  const [v, setV] = useState(value);
  useEffect(() => { setV(value); }, [value]);
  return (
    <Textarea
      value={v}
      rows={rows}
      placeholder={placeholder}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v !== value && onSave(v)}
      className="leading-relaxed"
    />
  );
}

function NumberField({
  value, onSave, prefix,
}: { value: number | null; onSave: (v: number | null) => void; prefix?: string }) {
  const [v, setV] = useState(value == null ? "" : String(value));
  useEffect(() => { setV(value == null ? "" : String(value)); }, [value]);
  return (
    <div className="relative">
      {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
      <Input
        type="number"
        className={prefix ? "pl-5" : ""}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          const trimmed = v.trim();
          const next = trimmed === "" ? null : Number(trimmed);
          if (next !== value) onSave(next);
        }}
      />
    </div>
  );
}

function Column({ stage, count, children }: { stage: Stage; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  const tooltip = STAGE_TOOLTIPS[stage];
  return (
    <div className="flex w-[78vw] sm:w-72 shrink-0 flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <div className="flex items-center gap-1.5">
          <StageChip stage={stage} />
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground" aria-label="Stage info">
                  <HelpCircle className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[240px] text-xs">
                {tooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <span className="text-xs font-mono text-muted-foreground">{count}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[100px] space-y-2 p-2 transition-colors ${isOver ? "bg-secondary/60" : ""}`}
      >
        {children}
      </div>
    </div>
  );
}

function DraggableCard({ card, onOpen }: { card: EventCard; onOpen: () => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: card.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onOpen}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <PipelineCard card={card} />
    </div>
  );
}

function PipelineCard({ card, dragging }: { card: EventCard; dragging?: boolean }) {
  const value = cardValue(card);
  return (
    <div className={`rounded-lg border bg-background p-3 text-sm shadow-[var(--shadow-card)] ${dragging ? "rotate-1 shadow-[var(--shadow-elevated)]" : ""} ${card.archived ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium leading-tight">{card.event_name}</div>
        <div className="flex items-center gap-1 shrink-0">
          {card.archived && <Archive className="h-3 w-3 text-muted-foreground" />}
          {card.hot_lead && <Flame className="h-3.5 w-3.5" style={{ color: "var(--clay)" }} />}
        </div>
      </div>
      {card.course && <div className="mt-1 text-xs text-muted-foreground truncate">{card.course}</div>}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        {card.event_date ? <span>{format(new Date(card.event_date), "MMM d")}</span> : <span />}
        {card.player_count && <span className="font-mono">{card.player_count} players</span>}
      </div>
      {value > 0 && (
        <div className="mt-1.5 flex items-center gap-1 text-[11px] font-mono text-foreground/80">
          <DollarSign className="h-3 w-3" />
          {value.toLocaleString()}
        </div>
      )}
    </div>
  );
}
