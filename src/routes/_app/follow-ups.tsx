import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { StageChip } from "@/components/StageChip";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { Phone, AlertTriangle, CalendarClock, Check, Clock, Plus, Sparkles, MailQuestion, CalendarX, CalendarPlus, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, isPast, isToday, isSameDay, startOfDay, subHours, subDays } from "date-fns";
import { type Stage } from "@/lib/stages";
import { toast } from "sonner";
import { openGCal } from "@/lib/gcal";

export const Route = createFileRoute("/_app/follow-ups")({
  component: FollowUpsPage,
});

type Task = {
  id: string;
  next_action: string;
  next_action_at: string;
  priority: "low" | "normal" | "high" | "urgent";
  status: "pending" | "done" | "snoozed";
  events: { id: string; event_name: string; stage: Stage } | null;
};

type LeadEvent = {
  id: string;
  event_name: string;
  stage: Stage;
  created_at: string;
  last_contact_at: string | null;
  course: string | null;
};

function FollowUpsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allEvents, setAllEvents] = useState<LeadEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadDate, setAddLeadDate] = useState<string | undefined>(undefined);

  const openAddLeadFor = (d?: Date) => {
    setAddLeadDate(d ? format(d, "yyyy-MM-dd") : undefined);
    setAddLeadOpen(true);
  };

  const load = useCallback(async () => {
    const [tasksRes, eventsRes] = await Promise.all([
      supabase
        .from("tasks")
        .select("id,next_action,next_action_at,priority,status,event_id,events(id,event_name,stage)")
        .eq("status", "pending")
        .order("next_action_at", { ascending: true }),
      supabase
        .from("events")
        .select("id,event_name,stage,created_at,last_contact_at,course")
        .not("stage", "in", "(closed_won,closed_lost)")
        .order("created_at", { ascending: false }),
    ]);
    setTasks((tasksRes.data ?? []) as any);
    setAllEvents((eventsRes.data ?? []) as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const overdue = tasks.filter((t) => isPast(new Date(t.next_action_at)) && !isToday(new Date(t.next_action_at)));
    const today = tasks.filter((t) => isToday(new Date(t.next_action_at)));
    const upcoming = tasks.filter((t) => !isPast(new Date(t.next_action_at)) && !isToday(new Date(t.next_action_at)));
    return { overdue, today, upcoming };
  }, [tasks]);

  // Lead-based groups (events, not tasks)
  const leadGroups = useMemo(() => {
    const eventIdsWithTasks = new Set(tasks.map((t) => t.events?.id).filter(Boolean));
    const cutoff48h = subHours(new Date(), 48);
    const cutoff3d = subDays(new Date(), 3);

    const justAdded = allEvents.filter(
      (e) => new Date(e.created_at) > cutoff48h && !eventIdsWithTasks.has(e.id),
    );
    const awaitingResponse = allEvents.filter(
      (e) =>
        (e.stage === "pitch_delivered" || e.stage === "proposal_sent") &&
        (!e.last_contact_at || new Date(e.last_contact_at) < cutoff3d),
    );
    const noDateSet = allEvents.filter((e) => !eventIdsWithTasks.has(e.id));

    return { justAdded, awaitingResponse, noDateSet };
  }, [allEvents, tasks]);

  const tasksByDay = useMemo(() => {
    const map: Map<string, Task[]> = new Map();
    tasks.forEach((t) => {
      const key = format(startOfDay(new Date(t.next_action_at)), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    });
    return map;
  }, [tasks]);

  const selectedTasks = selectedDate
    ? tasks.filter((t) => isSameDay(new Date(t.next_action_at), selectedDate))
    : [];

  const completeTask = async (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    const { error } = await supabase.from("tasks").update({ status: "done" }).eq("id", id);
    if (error) { toast.error("Failed"); load(); } else toast.success("Marked done");
  };

  const snoozeTask = async (id: string, hours: number) => {
    const newAt = new Date(Date.now() + hours * 3600000).toISOString();
    setTasks((prev) => prev.map((t) => t.id === id ? { ...t, next_action_at: newAt } : t));
    const { error } = await supabase.from("tasks").update({ next_action_at: newAt }).eq("id", id);
    if (error) { toast.error("Failed"); load(); } else toast.success(`Snoozed ${hours}h`);
  };

  const deleteEvent = async (eventId: string) => {
    setTasks((prev) => prev.filter((t) => t.events?.id !== eventId));
    setAllEvents((prev) => prev.filter((e) => e.id !== eventId));
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) { toast.error("Delete failed: " + error.message); load(); }
    else toast.success("Event deleted");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Follow-Ups</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stay on top of every callback, email, and check-in.</p>
        </div>
        <Button size="sm" onClick={() => openAddLeadFor()}>
          <Plus className="mr-1.5 h-4 w-4" />Add Lead
        </Button>
      </header>

      <AddLeadDialog
        trigger={null}
        open={addLeadOpen}
        onOpenChange={setAddLeadOpen}
        defaultDate={addLeadDate}
        onCreated={() => load()}
      />

      <Tabs defaultValue="list" className="w-full">
        <TabsList>
          <TabsTrigger value="list">List</TabsTrigger>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-6 space-y-6">
          {loading ? (
            <div className="text-muted-foreground">Loading…</div>
          ) : (
            <>
              <Group title="Overdue" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} tasks={groups.overdue} accent="destructive" onComplete={completeTask} onSnooze={snoozeTask} />
              <Group title="Today" icon={<CalendarClock className="h-4 w-4" style={{ color: "var(--gold)" }} />} tasks={groups.today} onComplete={completeTask} onSnooze={snoozeTask} />
              <Group title="Upcoming" icon={<Clock className="h-4 w-4 text-muted-foreground" />} tasks={groups.upcoming} onComplete={completeTask} onSnooze={snoozeTask} />

              <LeadGroup
                title="Leads Just Added"
                description="Added in the last 48 hours with no follow-up scheduled."
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                events={leadGroups.justAdded}
              />
              <LeadGroup
                title="Awaiting Response"
                description="Pitch or proposal sent — no contact logged in the last 3 days."
                icon={<MailQuestion className="h-4 w-4" style={{ color: "var(--stage-pitch)" }} />}
                events={leadGroups.awaitingResponse}
              />
              <LeadGroup
                title="No Date Set"
                description="Active leads with zero follow-up date assigned."
                icon={<CalendarX className="h-4 w-4" style={{ color: "var(--gold)" }} />}
                events={leadGroups.noDateSet}
                accent="warning"
              />
            </>
          )}
        </TabsContent>

        <TabsContent value="calendar" className="mt-6">
          <div className="grid gap-6 md:grid-cols-[auto_1fr]">
            <div className="rounded-xl border bg-card p-3 shadow-[var(--shadow-card)]">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                modifiers={{
                  hasTasks: Array.from(tasksByDay.keys()).map((k) => new Date(k + "T12:00:00")),
                }}
                modifiersClassNames={{
                  hasTasks: "relative font-semibold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
                }}
              />
            </div>
            <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-lg font-semibold">
                  {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Pick a date"}
                </h2>
                {selectedDate && (
                  <Button size="sm" variant="outline" onClick={() => openAddLeadFor(selectedDate)}>
                    <Plus className="mr-1.5 h-3.5 w-3.5" />Add lead
                  </Button>
                )}
              </div>
              {selectedTasks.length === 0 ? (
                <div className="mt-4 rounded-md bg-secondary/50 px-3 py-6 text-center text-sm text-muted-foreground">
                  <div>Nothing scheduled for this day.</div>
                  {selectedDate && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="mt-2"
                      onClick={() => openAddLeadFor(selectedDate)}
                    >
                      <Plus className="mr-1.5 h-3.5 w-3.5" />Add a lead for this date
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="mt-4 divide-y">
                  {selectedTasks.map((t) => (
                    <TaskRow key={t.id} t={t} onComplete={completeTask} onSnooze={snoozeTask} />
                  ))}
                </ul>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Group({
  title, icon, tasks, accent, onComplete, onSnooze,
}: {
  title: string;
  icon?: React.ReactNode;
  tasks: Task[];
  accent?: "destructive";
  onComplete: (id: string) => void;
  onSnooze: (id: string, h: number) => void;
}) {
  return (
    <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <header className="flex items-center justify-between px-5 py-3 border-b">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-lg font-semibold">{title}</h2>
        </div>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{tasks.length}</span>
      </header>
      {tasks.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Nothing here.</div>
      ) : (
        <ul className="divide-y">
          {tasks.map((t) => <TaskRow key={t.id} t={t} accent={accent} onComplete={onComplete} onSnooze={onSnooze} />)}
        </ul>
      )}
    </section>
  );
}

function TaskRow({
  t, accent, onComplete, onSnooze,
}: {
  t: Task;
  accent?: "destructive";
  onComplete: (id: string) => void;
  onSnooze: (id: string, h: number) => void;
}) {
  return (
    <li className="px-3 sm:px-5 py-3 flex items-center gap-2 sm:gap-3">
      <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => onComplete(t.id)} aria-label="Complete">
        <Check className="h-3.5 w-3.5" />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
          <span className={`font-mono ${accent === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>
            {format(new Date(t.next_action_at), "MMM d · h:mm a")}
          </span>
          {t.events && <StageChip stage={t.events.stage} />}
          {t.priority !== "normal" && (
            <span className="rounded-full px-1.5 py-0.5 text-[10px] uppercase font-semibold tracking-wider"
              style={{
                backgroundColor: t.priority === "urgent" ? "color-mix(in oklch, var(--clay) 18%, transparent)" : "var(--secondary)",
                color: t.priority === "urgent" ? "var(--clay)" : "var(--muted-foreground)",
              }}>{t.priority}</span>
          )}
        </div>
        <div className="mt-0.5 truncate font-medium text-sm">{t.events?.event_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground truncate">{t.next_action}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button asChild size="sm" variant="default" className="h-8 w-8 p-0">
          <Link to="/call" search={{ eventId: t.events?.id }}><Phone className="h-3.5 w-3.5" /></Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0"
          title="Add to Google Calendar"
          onClick={() =>
            openGCal({
              title: `${t.next_action}${t.events ? ` — ${t.events.event_name}` : ""}`,
              details: t.events?.event_name ?? "",
              start: new Date(t.next_action_at),
            })
          }
        >
          <CalendarPlus className="h-3.5 w-3.5" />
        </Button>
        <div className="hidden sm:flex gap-1">
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => onSnooze(t.id, 1)}>+1h</Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => onSnooze(t.id, 24)}>+1d</Button>
        </div>
      </div>
    </li>
  );
}

function LeadGroup({
  title, description, icon, events, accent,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  events: LeadEvent[];
  accent?: "warning";
}) {
  return (
    <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
      <header className="flex items-start justify-between gap-3 px-5 py-3 border-b">
        <div className="flex items-start gap-2">
          <div className="mt-0.5">{icon}</div>
          <div>
            <h2 className="font-display text-lg font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-xs font-mono"
          style={{
            backgroundColor: accent === "warning" ? "color-mix(in oklch, var(--gold) 18%, transparent)" : "var(--secondary)",
            color: accent === "warning" ? "color-mix(in oklch, var(--gold) 50%, var(--foreground))" : "var(--muted-foreground)",
          }}
        >
          {events.length}
        </span>
      </header>
      {events.length === 0 ? (
        <div className="px-5 py-6 text-sm text-muted-foreground">Nothing here.</div>
      ) : (
        <ul className="divide-y">
          {events.map((e) => (
            <li key={e.id} className="px-5 py-3 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <StageChip stage={e.stage} />
                  <span className="text-muted-foreground font-mono">
                    Added {format(new Date(e.created_at), "MMM d")}
                  </span>
                </div>
                <div className="mt-0.5 truncate font-medium">{e.event_name}</div>
                {e.course && <div className="text-xs text-muted-foreground truncate">{e.course}</div>}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button asChild size="sm" variant="default">
                  <Link to="/call" search={{ eventId: e.id }}><Phone className="h-3.5 w-3.5" /></Link>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
