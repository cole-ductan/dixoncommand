import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { StageChip } from "@/components/StageChip";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { Phone, AlertTriangle, CalendarClock, Check, Clock, Plus } from "lucide-react";
import { format, isPast, isToday, isSameDay, startOfDay } from "date-fns";
import { type Stage } from "@/lib/stages";
import { toast } from "sonner";

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

function FollowUpsPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [addLeadOpen, setAddLeadOpen] = useState(false);
  const [addLeadDate, setAddLeadDate] = useState<string | undefined>(undefined);

  const openAddLeadFor = (d?: Date) => {
    setAddLeadDate(d ? format(d, "yyyy-MM-dd") : undefined);
    setAddLeadOpen(true);
  };

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("id,next_action,next_action_at,priority,status,events(id,event_name,stage)")
      .eq("status", "pending")
      .order("next_action_at", { ascending: true });
    setTasks((data ?? []) as any);
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const groups = useMemo(() => {
    const overdue = tasks.filter((t) => isPast(new Date(t.next_action_at)) && !isToday(new Date(t.next_action_at)));
    const today = tasks.filter((t) => isToday(new Date(t.next_action_at)));
    const upcoming = tasks.filter((t) => !isPast(new Date(t.next_action_at)) && !isToday(new Date(t.next_action_at)));
    return { overdue, today, upcoming };
  }, [tasks]);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold md:text-4xl">Follow-Ups</h1>
        <p className="mt-1 text-sm text-muted-foreground">Stay on top of every callback, email, and check-in.</p>
      </header>

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
              <h2 className="font-display text-lg font-semibold">
                {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Pick a date"}
              </h2>
              {selectedTasks.length === 0 ? (
                <div className="mt-4 rounded-md bg-secondary/50 px-3 py-4 text-sm text-muted-foreground">
                  Nothing scheduled for this day.
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
    <li className="px-5 py-3 flex items-center gap-3">
      <Button size="icon" variant="outline" className="h-7 w-7 shrink-0" onClick={() => onComplete(t.id)} aria-label="Complete">
        <Check className="h-3.5 w-3.5" />
      </Button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs">
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
        <div className="mt-0.5 truncate font-medium">{t.events?.event_name ?? "—"}</div>
        <div className="text-xs text-muted-foreground truncate">{t.next_action}</div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button asChild size="sm" variant="default">
          <Link to="/call" search={{ eventId: t.events?.id }}><Phone className="h-3.5 w-3.5" /></Link>
        </Button>
        <div className="hidden sm:flex gap-1">
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => onSnooze(t.id, 1)}>+1h</Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={() => onSnooze(t.id, 24)}>+1d</Button>
        </div>
      </div>
    </li>
  );
}
