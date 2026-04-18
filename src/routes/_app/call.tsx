import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/call")({
  component: () => (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
      <h1 className="font-display text-3xl font-semibold">Live Call Workspace</h1>
      <p className="mt-2 text-muted-foreground">Coming next: 3-pane cockpit with script, structured note capture, and DB summary generator.</p>
    </div>
  ),
});
