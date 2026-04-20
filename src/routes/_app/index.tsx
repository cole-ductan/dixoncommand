import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { StageChip } from "@/components/StageChip";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { Phone, KanbanSquare, CalendarClock, AlertTriangle, Flame, Sparkles } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { STAGES, type Stage } from "@/lib/stages";
import { seedSampleData } from "@/lib/sampleData";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/")({
  component: Dashboard,
});

type TaskWithEvent = {
  id: string;
  next_action: string;
  next_action_at: string;
  priority: string;
  status: string;
  events: { id: string; event_name: string; stage: Stage } | null;
};

type EventLite = { id: string; event_name: string; stage: Stage; updated_at: string; hot_lead: boolean; course: string | null; event_date: string | null };

function Dashboard() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<TaskWithEvent[]>([]);
  const [events, setEvents] = useState<EventLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [todayLabel, setTodayLabel] = useState<string>("");
  useEffect(() => { setTodayLabel(format(new Date(), "EEEE, MMMM d")); }, []);

  const load = async () => {
    const [t, e] = await Promise.all([
      supabase
        .from("tasks")
        .select("id,next_action,next_action_at,priority,status,events(id,event_name,stage)")
        .eq("status", "pending")
        .order("next_action_at", { ascending: true })
        .limit(50),
      supabase
        .from("events")
        .select("id,event_name,stage,updated_at,hot_lead,course,event_date")
        .order("updated_at", { ascending: false }),
    ]);
    setTasks((t.data ?? []) as any);
    setEvents((e.data ?? []) as any);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleSeed = async () => {
    if (!user) return;
    setSeeding(true);
    try {
      const r = await seedSampleData(user.id);
      if (r.skipped) toast.info("You already have leads — sample data skipped.");
      else toast.success(`Loaded ${r.count} sample events.`);
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to seed");
    } finally {
      setSeeding(false);
    }
  };

  const overdue = tasks.filter((t) => isPast(new Date(t.next_action_at)) && !isToday(new Date(t.next_action_at)));
  const todayItems = tasks.filter((t) => isToday(new Date(t.next_action_at)));
  const upcoming = tasks.filter((t) => !isPast(new Date(t.next_action_at)) && !isToday(new Date(t.next_action_at)));
  const hot = events.filter((e) => e.hot_lead || e.stage === "pitch_delivered" || e.stage === "challenges_booked").slice(0, 6);

  const stageCounts = STAGES.map((s) => ({ ...s, count: events.filter((e) => e.stage === s.id).length }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">Today's Cockpit</h1>
          <p className="mt-1 text-sm text-muted-foreground">{todayLabel}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild><Link to="/call" search={{ new: "1" } as any}><Phone className="mr-2 h-4 w-4" />Start Call</Link></Button>
          <Button asChild variant="outline"><Link to="/pipeline"><KanbanSquare className="mr-2 h-4 w-4" />Pipeline</Link></Button>
          <Button asChild variant="outline"><Link to="/follow-ups"><CalendarClock className="mr-2 h-4 w-4" />Follow-Ups</Link></Button>
          <AddLeadDialog onCreated={load} />
          {events.length === 0 && (
            <Button variant="ghost" onClick={handleSeed} disabled={seeding}>
              <Sparkles className="mr-2 h-4 w-4" />{seeding ? "Loading…" : "Load sample data"}
            </Button>
          )}
        </div>
      </header>

      {loading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 space-y-6">
            <Card title="Overdue" icon={<AlertTriangle className="h-4 w-4 text-destructive" />} count={overdue.length}>
              {overdue.length === 0 ? <Empty>Nothing overdue. Nice.</Empty> : <TaskList items={overdue} accent="destructive" />}
            </Card>
            <Card title="Today's Follow-Ups" icon={<CalendarClock className="h-4 w-4" style={{ color: "var(--gold)" }} />} count={todayItems.length}>
              {todayItems.length === 0 ? <Empty>No follow-ups scheduled today.</Empty> : <TaskList items={todayItems} />}
            </Card>
            <Card title="Upcoming" count={upcoming.length}>
              {upcoming.length === 0 ? <Empty>Schedule something next.</Empty> : <TaskList items={upcoming.slice(0, 8)} />}
            </Card>
          </section>

          <aside className="space-y-6">
            <Card title="Hot Leads" icon={<Flame className="h-4 w-4" style={{ color: "var(--clay)" }} />} count={hot.length}>
              {hot.length === 0 ? (
                <Empty>No hot leads yet. Mark events with the flame icon.</Empty>
              ) : (
                <ul className="divide-y">
                  {hot.map((e) => (
                    <li key={e.id} className="py-2.5">
                      <Link to="/call" search={{ eventId: e.id } as any} className="block group">
                        <div className="flex items-center justify-between">
                          <div className="font-medium group-hover:text-primary truncate pr-2">{e.event_name}</div>
                          <StageChip stage={e.stage} />
                        </div>
                        {(e.course || e.event_date) && (
                          <div className="mt-0.5 text-xs text-muted-foreground truncate">
                            {[e.course, e.event_date && format(new Date(e.event_date), "MMM d")].filter(Boolean).join(" · ")}
                          </div>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card title="Pipeline by Stage">
              <ul className="space-y-1.5">
                {stageCounts.map((s) => (
                  <li key={s.id} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full" style={{ background: s.tokenVar }} />
                      {s.label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">{s.count}</span>
                  </li>
                ))}
              </ul>
            </Card>
          </aside>
        </div>
      )}
    </div>
  );
}

function Card({ title, icon, count, children }: { title: string; icon?: React.ReactNode; count?: number; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-display text-lg font-semibold">{title}</h2>
        </div>
        {typeof count === "number" && (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{count}</span>
        )}
      </div>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-md bg-secondary/50 px-3 py-4 text-sm text-muted-foreground">{children}</div>;
}

function TaskList({ items, accent }: { items: TaskWithEvent[]; accent?: "destructive" }) {
  return (
    <ul className="divide-y">
      {items.map((t) => (
        <li key={t.id} className="py-2.5">
          <Link to="/call" search={{ eventId: t.events?.id } as any} className="flex items-start justify-between gap-3 group">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-sm">
                <span className={`font-mono text-xs ${accent === "destructive" ? "text-destructive" : "text-muted-foreground"}`}>
                  {format(new Date(t.next_action_at), "MMM d · h:mm a")}
                </span>
                {t.events && <StageChip stage={t.events.stage} />}
              </div>
              <div className="mt-0.5 truncate font-medium group-hover:text-primary">
                {t.events?.event_name ?? "—"}
              </div>
              <div className="text-xs text-muted-foreground truncate">{t.next_action}</div>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
