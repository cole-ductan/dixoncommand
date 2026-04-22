import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CalendarRange, RefreshCw, ExternalLink, Loader2, Plus, MapPin } from "lucide-react";
import { listCalendarEvents } from "@/lib/google.functions";
import { openGCal } from "@/lib/gcal";
import { format, isSameDay, startOfDay, addDays } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/calendar")({
  component: CalendarPage,
});

type Ev = {
  id: string;
  summary: string;
  description: string | null;
  start: string | null;
  end: string | null;
  allDay: boolean;
  location: string | null;
  htmlLink: string | null;
};

function CalendarPage() {
  const [events, setEvents] = useState<Ev[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const timeMin = startOfDay(addDays(new Date(), -7)).toISOString();
      const timeMax = startOfDay(addDays(new Date(), 60)).toISOString();
      const res = await listCalendarEvents({
        data: { timeMin, timeMax, maxResults: 250 },
      });
      setEvents(res.events);
    } catch (e: any) {
      const msg = e?.message ?? "Failed to load Calendar";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const eventsByDay = useMemo(() => {
    const m = new Map<string, Ev[]>();
    events.forEach((e) => {
      if (!e.start) return;
      const key = format(startOfDay(new Date(e.start)), "yyyy-MM-dd");
      if (!m.has(key)) m.set(key, []);
      m.get(key)!.push(e);
    });
    return m;
  }, [events]);

  const selected = selectedDate
    ? events.filter((e) => e.start && isSameDay(new Date(e.start), selectedDate))
    : [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold md:text-4xl flex items-center gap-2">
            <CalendarRange className="h-7 w-7 text-primary" /> Calendar
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Your connected Google Calendar.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="outline">
            <a href="https://calendar.google.com" target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Open Google Calendar
            </a>
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openGCal({
                title: "New event",
                start: selectedDate ?? new Date(),
              })
            }
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add event
          </Button>
          <Button size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </header>

      {error && (
        <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
          <div className="mt-1 text-xs text-muted-foreground">
            If you haven't connected Google yet, click the Google button in the top bar.
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[auto_1fr]">
        <div className="rounded-xl border bg-card p-3 shadow-[var(--shadow-card)]">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            modifiers={{
              hasEvents: Array.from(eventsByDay.keys()).map((k) => new Date(k + "T12:00:00")),
            }}
            modifiersClassNames={{
              hasEvents:
                "relative font-semibold after:absolute after:bottom-1 after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-primary",
            }}
          />
        </div>
        <div className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">
              {selectedDate ? format(selectedDate, "EEEE, MMM d") : "Pick a date"}
            </h2>
            {selectedDate && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  openGCal({
                    title: "New event",
                    start: selectedDate,
                  })
                }
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
              </Button>
            )}
          </div>

          <ScrollArea className="mt-4 max-h-[60vh]">
            {loading ? (
              <div className="flex items-center text-sm text-muted-foreground p-6">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading events…
              </div>
            ) : selected.length === 0 ? (
              <div className="rounded-md bg-secondary/50 px-3 py-6 text-center text-sm text-muted-foreground">
                Nothing scheduled for this day.
              </div>
            ) : (
              <ul className="divide-y">
                {selected.map((e) => (
                  <li key={e.id} className="py-3">
                    <a
                      href={e.htmlLink ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="block hover:bg-secondary/40 -mx-3 px-3 py-1 rounded"
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium text-sm">{e.summary}</span>
                        <span className="shrink-0 text-[10px] font-mono text-muted-foreground">
                          {e.allDay
                            ? "All day"
                            : e.start
                              ? format(new Date(e.start), "h:mm a")
                              : ""}
                        </span>
                      </div>
                      {e.location && (
                        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {e.location}
                        </div>
                      )}
                      {e.description && (
                        <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {e.description}
                        </div>
                      )}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}