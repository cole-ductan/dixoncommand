import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { STAGES, type Stage } from "@/lib/stages";
import { StageChip } from "@/components/StageChip";

export const Route = createFileRoute("/_app/pipeline")({
  component: PipelinePage,
});

function PipelinePage() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => {
    supabase.from("events").select("id,event_name,stage,course,event_date").then(({ data }) => setEvents(data ?? []));
  }, []);
  return (
    <div className="px-4 py-6 md:px-8">
      <h1 className="font-display text-3xl font-semibold mb-6">Pipeline</h1>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STAGES.map((s) => {
          const items = events.filter((e) => e.stage === s.id);
          return (
            <div key={s.id} className="w-72 shrink-0 rounded-xl border bg-card p-3">
              <div className="mb-3 flex items-center justify-between px-1">
                <StageChip stage={s.id as Stage} />
                <span className="text-xs font-mono text-muted-foreground">{items.length}</span>
              </div>
              <div className="space-y-2">
                {items.map((e) => (
                  <div key={e.id} className="rounded-md border bg-background p-3 text-sm shadow-[var(--shadow-card)]">
                    <div className="font-medium">{e.event_name}</div>
                    {e.course && <div className="text-xs text-muted-foreground mt-0.5">{e.course}</div>}
                  </div>
                ))}
                {items.length === 0 && <div className="text-xs text-muted-foreground px-1 py-2">Empty</div>}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-sm text-muted-foreground">Drag-and-drop and detail drawer coming next.</p>
    </div>
  );
}
