import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Plus, Trash2, AlertTriangle, CheckCircle2, CreditCard, CalendarRange, Target } from "lucide-react";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import {
  weekStartFriday, weekEndThursday, fmtWeekKey, lastNWeekStarts,
  POINT_ACTIVITIES, POINTS_TARGET, DAYS_OF_WEEK, shiftHours,
} from "@/lib/week";

export const Route = createFileRoute("/_app/my-week")({
  component: MyWeekPage,
});

type ScheduleRow = {
  id?: string;
  day_of_week: number;
  shift1_start: string | null;
  shift1_end: string | null;
  shift2_start: string | null;
  shift2_end: string | null;
};

type PointLog = {
  id: string;
  log_date: string;
  activity: string;
  points: number;
  notes: string | null;
};

type WeeklyHistory = {
  weekStart: Date;
  goal: number;
  actual: number;
  points: number;
};

const emptyDay = (d: number): ScheduleRow => ({
  day_of_week: d,
  shift1_start: null, shift1_end: null,
  shift2_start: null, shift2_end: null,
});

function MyWeekPage() {
  const { user } = useAuth();
  const weekStart = useMemo(() => weekStartFriday(), []);
  const weekEnd = useMemo(() => weekEndThursday(), []);
  const weekKey = fmtWeekKey(weekStart);

  const [schedule, setSchedule] = useState<ScheduleRow[]>(
    Array.from({ length: 7 }, (_, i) => emptyDay(i)),
  );
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [logs, setLogs] = useState<PointLog[]>([]);
  const [newActivity, setNewActivity] = useState<string>("");
  const [newNotes, setNewNotes] = useState("");
  const [newDate, setNewDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [goal, setGoal] = useState<string>("");
  const [history, setHistory] = useState<WeeklyHistory[]>([]);

  // Load this week's schedule, logs, goal
  const load = useCallback(async () => {
    if (!user) return;
    const [sched, log, goalRow] = await Promise.all([
      supabase.from("cm_schedules").select("*").eq("week_start", weekKey),
      supabase
        .from("point_logs")
        .select("*")
        .gte("log_date", weekKey)
        .lte("log_date", fmtWeekKey(weekEnd))
        .order("log_date", { ascending: false }),
      supabase.from("weekly_goals").select("*").eq("week_start", weekKey).maybeSingle(),
    ]);

    const next = Array.from({ length: 7 }, (_, i) => emptyDay(i));
    (sched.data ?? []).forEach((row: any) => {
      next[row.day_of_week] = {
        id: row.id,
        day_of_week: row.day_of_week,
        shift1_start: row.shift1_start,
        shift1_end: row.shift1_end,
        shift2_start: row.shift2_start,
        shift2_end: row.shift2_end,
      };
    });
    setSchedule(next);
    setLogs((log.data ?? []) as PointLog[]);
    setGoal(goalRow.data?.goal != null ? String(goalRow.data.goal) : "");
  }, [user, weekKey, weekEnd]);

  // Load 8-week history
  const loadHistory = useCallback(async () => {
    if (!user) return;
    const weeks = lastNWeekStarts(8);
    const start = fmtWeekKey(weeks[weeks.length - 1]);
    const end = fmtWeekKey(addDays(weeks[0], 6));

    const [goalsRes, logsRes, eventsRes] = await Promise.all([
      supabase.from("weekly_goals").select("week_start,goal").gte("week_start", start).lte("week_start", end),
      supabase.from("point_logs").select("log_date,points").gte("log_date", start).lte("log_date", end),
      supabase
        .from("events")
        .select("updated_at,stage")
        .eq("stage", "closed_won")
        .gte("updated_at", start),
    ]);

    const goalsMap = new Map<string, number>();
    (goalsRes.data ?? []).forEach((g: any) => goalsMap.set(g.week_start, g.goal));

    const inWeek = (d: Date, ws: Date) => d >= ws && d <= addDays(ws, 6);

    const rows: WeeklyHistory[] = weeks.map((ws) => {
      const wsKey = fmtWeekKey(ws);
      const points = (logsRes.data ?? [])
        .filter((l: any) => inWeek(new Date(l.log_date + "T12:00:00"), ws))
        .reduce((s: number, l: any) => s + (l.points || 0), 0);
      const actual = (eventsRes.data ?? [])
        .filter((e: any) => inWeek(new Date(e.updated_at), ws))
        .length;
      return {
        weekStart: ws,
        goal: goalsMap.get(wsKey) ?? 0,
        actual,
        points,
      };
    });
    setHistory(rows);
  }, [user]);

  useEffect(() => { load(); loadHistory(); }, [load, loadHistory]);

  const totalHours = useMemo(
    () => schedule.reduce((sum, d) => sum + shiftHours(d.shift1_start, d.shift1_end) + shiftHours(d.shift2_start, d.shift2_end), 0),
    [schedule],
  );

  const totalPoints = useMemo(() => logs.reduce((s, l) => s + (l.points || 0), 0), [logs]);
  const surePay = totalPoints >= POINTS_TARGET;

  const updateCell = (dayIdx: number, field: keyof ScheduleRow, value: string) => {
    setSchedule((prev) => prev.map((r, i) => i === dayIdx ? { ...r, [field]: value || null } : r));
  };

  const saveSchedule = async () => {
    if (!user) return;
    setScheduleSaving(true);
    const rows = schedule.map((r) => ({
      user_id: user.id,
      week_start: weekKey,
      day_of_week: r.day_of_week,
      shift1_start: r.shift1_start,
      shift1_end: r.shift1_end,
      shift2_start: r.shift2_start,
      shift2_end: r.shift2_end,
    }));
    const { error } = await supabase
      .from("cm_schedules")
      .upsert(rows, { onConflict: "user_id,week_start,day_of_week" });
    setScheduleSaving(false);
    if (error) toast.error("Save failed: " + error.message);
    else { toast.success("Schedule saved"); load(); }
  };

  const addLog = async () => {
    if (!user || !newActivity) {
      toast.error("Pick an activity");
      return;
    }
    const def = POINT_ACTIVITIES.find((a) => a.value === newActivity);
    if (!def) return;
    const { error } = await supabase.from("point_logs").insert({
      user_id: user.id,
      log_date: newDate,
      activity: newActivity as any,
      points: def.points,
      notes: newNotes.trim() || null,
    });
    if (error) toast.error("Save failed: " + error.message);
    else {
      toast.success(`+${def.points} pt logged`);
      setNewActivity(""); setNewNotes("");
      load();
    }
  };

  const removeLog = async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    const { error } = await supabase.from("point_logs").delete().eq("id", id);
    if (error) { toast.error("Delete failed"); load(); }
  };

  const saveGoal = async () => {
    if (!user) return;
    const g = goal.trim() === "" ? 0 : Number(goal);
    if (Number.isNaN(g) || g < 0) { toast.error("Goal must be a positive number"); return; }
    const { error } = await supabase
      .from("weekly_goals")
      .upsert({ user_id: user.id, week_start: weekKey, goal: g }, { onConflict: "user_id,week_start" });
    if (error) toast.error("Save failed: " + error.message);
    else { toast.success("Goal saved"); loadHistory(); }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">My Week</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Week of {format(weekStart, "MMM d")} – {format(weekEnd, "MMM d, yyyy")} · resets every Friday
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-full border bg-secondary/40 px-3 py-1.5 text-xs font-mono">
          <CalendarRange className="h-3.5 w-3.5" />
          {totalHours.toFixed(1)} CM hrs · {totalPoints}/{POINTS_TARGET} pts
        </div>
      </header>

      {/* Section A — CM Schedule */}
      <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <header className="flex items-center justify-between border-b px-5 py-3">
          <div>
            <h2 className="font-display text-lg font-semibold">CM Schedule</h2>
            <p className="text-xs text-muted-foreground">Calling Mode shifts for this week.</p>
          </div>
          <Button size="sm" onClick={saveSchedule} disabled={scheduleSaving}>
            {scheduleSaving ? "Saving…" : "Save Schedule"}
          </Button>
        </header>
        <div className="overflow-x-auto p-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-2 py-2 text-left font-semibold">Day</th>
                <th className="px-2 py-2 text-left font-semibold">Shift 1 Start</th>
                <th className="px-2 py-2 text-left font-semibold">Shift 1 End</th>
                <th className="px-2 py-2 text-left font-semibold">Shift 2 Start</th>
                <th className="px-2 py-2 text-left font-semibold">Shift 2 End</th>
                <th className="px-2 py-2 text-right font-semibold">Hours</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {DAYS_OF_WEEK.map((label, idx) => {
                const row = schedule[idx];
                const hrs = shiftHours(row.shift1_start, row.shift1_end) + shiftHours(row.shift2_start, row.shift2_end);
                return (
                  <tr key={label}>
                    <td className="px-2 py-2 font-medium">{label}</td>
                    <td className="px-1 py-1.5"><Input type="time" value={row.shift1_start ?? ""} onChange={(e) => updateCell(idx, "shift1_start", e.target.value)} className="h-8" /></td>
                    <td className="px-1 py-1.5"><Input type="time" value={row.shift1_end ?? ""} onChange={(e) => updateCell(idx, "shift1_end", e.target.value)} className="h-8" /></td>
                    <td className="px-1 py-1.5"><Input type="time" value={row.shift2_start ?? ""} onChange={(e) => updateCell(idx, "shift2_start", e.target.value)} className="h-8" /></td>
                    <td className="px-1 py-1.5"><Input type="time" value={row.shift2_end ?? ""} onChange={(e) => updateCell(idx, "shift2_end", e.target.value)} className="h-8" /></td>
                    <td className="px-2 py-2 text-right font-mono text-muted-foreground">{hrs > 0 ? hrs.toFixed(1) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t font-semibold">
                <td colSpan={5} className="px-2 py-3 text-right">Total CM Hours this week</td>
                <td className="px-2 py-3 text-right font-mono">{totalHours.toFixed(1)}</td>
              </tr>
            </tfoot>
          </table>
          <p className="mt-2 px-2 text-xs text-muted-foreground">
            Dixon recommends 20+ hours/week in Calling Mode for top performance.<br />
            <em>Note: CM hours alone do not earn SurePay points — log your activity points below.</em>
          </p>
        </div>
      </section>

      {/* Section B — Points Tracker */}
      <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <header className="border-b px-5 py-3">
          <h2 className="font-display text-lg font-semibold">Points Tracker</h2>
          <p className="text-xs text-muted-foreground">Log point-earning activities. Resets every Friday — points do not roll over.</p>
        </header>

        {/* Add new entry */}
        <div className="grid gap-3 border-b bg-secondary/20 p-4 md:grid-cols-[140px_1fr_1fr_auto]">
          <div className="grid gap-1">
            <Label className="text-xs">Date</Label>
            <Input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="h-9" />
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Activity</Label>
            <Select value={newActivity} onValueChange={setNewActivity}>
              <SelectTrigger className="h-9"><SelectValue placeholder="Pick an activity…" /></SelectTrigger>
              <SelectContent>
                {POINT_ACTIVITIES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label} <span className="ml-2 font-mono text-xs text-muted-foreground">+{a.points}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1">
            <Label className="text-xs">Notes (optional)</Label>
            <Input value={newNotes} onChange={(e) => setNewNotes(e.target.value)} className="h-9" placeholder="POC name, event…" />
          </div>
          <div className="flex items-end">
            <Button onClick={addLog} className="h-9 w-full md:w-auto"><Plus className="mr-1.5 h-3.5 w-3.5" />Log Activity</Button>
          </div>
        </div>

        {/* Log table */}
        {logs.length === 0 ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Nothing here.</div>
        ) : (
          <ul className="divide-y">
            {logs.map((l) => {
              const def = POINT_ACTIVITIES.find((a) => a.value === l.activity);
              return (
                <li key={l.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-20 shrink-0 text-xs font-mono text-muted-foreground">
                    {format(new Date(l.log_date + "T12:00:00"), "EEE MMM d")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{def?.label ?? l.activity}</div>
                    {l.notes && <div className="truncate text-xs text-muted-foreground">{l.notes}</div>}
                  </div>
                  <div className="shrink-0 rounded-full bg-secondary px-2 py-0.5 font-mono text-xs">+{l.points}</div>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLog(l.id)} aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="space-y-2 border-t px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">Total Points This Week</span>
            <span className="font-mono">{totalPoints} / {POINTS_TARGET}</span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full transition-all"
              style={{
                width: `${Math.min(100, (totalPoints / POINTS_TARGET) * 100)}%`,
                backgroundColor: surePay ? "var(--stage-won)" : "var(--gold)",
              }}
            />
          </div>
        </div>
      </section>

      {/* Section C — SurePay Status */}
      <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <header className="border-b px-5 py-3">
          <h2 className="font-display text-lg font-semibold">SurePay Status — Week of {format(weekStart, "MMM d")}</h2>
        </header>
        <div className="space-y-4 p-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-mono">{totalPoints} of {POINTS_TARGET} points earned</span>
              <span className={`font-mono text-xs ${surePay ? "text-[var(--stage-won)]" : "text-muted-foreground"}`}>
                {surePay ? "Secured" : `${POINTS_TARGET - totalPoints} to go`}
              </span>
            </div>
            <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full transition-all"
                style={{
                  width: `${Math.min(100, (totalPoints / POINTS_TARGET) * 100)}%`,
                  backgroundColor: surePay ? "var(--stage-won)" : "var(--gold)",
                }}
              />
            </div>
          </div>

          <div
            className="flex items-start gap-2 rounded-md p-3 text-sm"
            style={{
              backgroundColor: surePay ? "color-mix(in oklch, var(--stage-won) 12%, transparent)" : "color-mix(in oklch, var(--gold) 14%, transparent)",
              color: surePay ? "var(--stage-won)" : "color-mix(in oklch, var(--gold) 60%, var(--foreground))",
            }}
          >
            {surePay ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
            <span className="font-medium">
              {surePay
                ? "SurePay Secured — $500 minimum guaranteed"
                : `${POINTS_TARGET - totalPoints} pts to go — SurePay not yet secured`}
            </span>
          </div>

          <div className="rounded-md border bg-secondary/30 p-3 text-xs text-muted-foreground">
            If your earned commissions exceed $500 this week, you receive the higher amount.
            The $500 SurePay and commissions are not stacked.
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CreditCard className="h-3.5 w-3.5" />
            SurePay payments are issued via direct deposit every Wednesday.
          </div>

          <div
            className="rounded-md border-l-4 px-3 py-2 text-xs"
            style={{
              borderLeftColor: "var(--gold)",
              backgroundColor: "color-mix(in oklch, var(--gold) 10%, transparent)",
            }}
          >
            ⏳ Points reset every Friday. Reach {POINTS_TARGET} points before Thursday to secure SurePay.
          </div>
        </div>
      </section>

      {/* Section D — Closing Goals */}
      <section className="rounded-xl border bg-card shadow-[var(--shadow-card)]">
        <header className="flex flex-wrap items-end justify-between gap-3 border-b px-5 py-3">
          <div>
            <h2 className="font-display text-lg font-semibold">Closing Goals</h2>
            <p className="text-xs text-muted-foreground">Set this week's target. Past 8 weeks shown below.</p>
          </div>
          <div className="flex items-end gap-2">
            <div className="grid gap-1">
              <Label className="text-xs">This week's goal (closes)</Label>
              <Input
                type="number"
                min="0"
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="h-9 w-32"
                placeholder="e.g. 5"
              />
            </div>
            <Button size="sm" onClick={saveGoal}><Target className="mr-1.5 h-3.5 w-3.5" />Save Goal</Button>
          </div>
        </header>
        <div className="overflow-x-auto p-3">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 text-left font-semibold">Week Starts</th>
                <th className="px-3 py-2 text-right font-semibold">Goal</th>
                <th className="px-3 py-2 text-right font-semibold">Actual</th>
                <th className="px-3 py-2 text-right font-semibold">Points Earned</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {history.map((row, i) => {
                const isCurrent = i === 0;
                return (
                  <tr key={fmtWeekKey(row.weekStart)} className={isCurrent ? "bg-secondary/30" : ""}>
                    <td className="px-3 py-2 font-mono text-xs">
                      {format(row.weekStart, "MMM d, yyyy")}
                      {isCurrent && <span className="ml-2 rounded-full bg-primary/15 px-1.5 py-0.5 text-[9px] uppercase text-primary">Current</span>}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{row.goal || "—"}</td>
                    <td className="px-3 py-2 text-right font-mono">
                      <span className={row.goal > 0 && row.actual >= row.goal ? "text-[var(--stage-won)] font-semibold" : ""}>
                        {row.actual}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
