import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
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
import { Phone, Calendar, Flame, MapPin, Users, ExternalLink } from "lucide-react";
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
};

function PipelinePage() {
  const [events, setEvents] = useState<EventCard[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("events")
      .select("id,event_name,stage,course,event_date,hot_lead,player_count,entry_fee,where_left_off,notes")
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

  const active = activeId ? events.find((c) => c.id === activeId) : null;
  const open = openId ? events.find((c) => c.id === openId) : null;

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col">
      <header className="flex items-center justify-between gap-3 border-b px-4 py-3 md:px-8 md:py-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-semibold">Pipeline</h1>
          <p className="text-xs text-muted-foreground">Drag cards across stages. Click to inspect.</p>
        </div>
        <AddLeadDialog onCreated={load} />
      </header>

      {loading ? (
        <div className="flex-1 grid place-items-center text-muted-foreground">Loading…</div>
      ) : (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex-1 min-h-0 overflow-x-auto">
            <div className="flex h-full gap-3 px-4 md:px-8 py-4 min-w-max">
              {STAGES.map((s) => {
                const items = events.filter((e) => e.stage === s.id);
                return (
                  <Column key={s.id} stage={s.id} count={items.length}>
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
        <SheetContent side="right" className="w-full sm:max-w-md">
          {open && (
            <>
              <SheetHeader>
                <SheetTitle className="font-display text-2xl pr-8">{open.event_name}</SheetTitle>
                <SheetDescription className="flex items-center gap-2"><StageChip stage={open.stage} /></SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-4 text-sm">
                {open.course && <Detail icon={<MapPin className="h-3.5 w-3.5" />} label="Course" value={open.course} />}
                {open.event_date && <Detail icon={<Calendar className="h-3.5 w-3.5" />} label="Event date" value={format(new Date(open.event_date), "EEEE, MMMM d, yyyy")} />}
                {open.player_count && <Detail icon={<Users className="h-3.5 w-3.5" />} label="Players" value={String(open.player_count)} />}
                {open.entry_fee && <Detail label="Entry fee" value={`$${open.entry_fee}`} />}
                {open.where_left_off && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Where we left off</div>
                    <p className="mt-1 leading-relaxed">{open.where_left_off}</p>
                  </div>
                )}
                {open.notes && (
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes</div>
                    <p className="mt-1 leading-relaxed whitespace-pre-wrap">{open.notes}</p>
                  </div>
                )}
                <div className="pt-4 flex flex-wrap gap-2">
                  <Button asChild>
                    <Link to="/call" search={{ eventId: open.id }}><Phone className="mr-1.5 h-4 w-4" />Open in Call Workspace<ExternalLink className="ml-1 h-3 w-3" /></Link>
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
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

function Column({ stage, count, children }: { stage: Stage; count: number; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border bg-card">
      <div className="flex items-center justify-between border-b px-3 py-2">
        <StageChip stage={stage} />
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
  return (
    <div className={`rounded-lg border bg-background p-3 text-sm shadow-[var(--shadow-card)] ${dragging ? "rotate-1 shadow-[var(--shadow-elevated)]" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium leading-tight">{card.event_name}</div>
        {card.hot_lead && <Flame className="h-3.5 w-3.5 shrink-0" style={{ color: "var(--clay)" }} />}
      </div>
      {card.course && <div className="mt-1 text-xs text-muted-foreground truncate">{card.course}</div>}
      <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
        {card.event_date ? <span>{format(new Date(card.event_date), "MMM d")}</span> : <span />}
        {card.player_count && <span className="font-mono">{card.player_count} players</span>}
      </div>
    </div>
  );
}
