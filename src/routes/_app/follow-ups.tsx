import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/follow-ups")({
  component: () => (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8">
      <h1 className="font-display text-3xl font-semibold">Follow-Ups</h1>
      <p className="mt-2 text-muted-foreground">Calendar + list view with date+time scheduling coming next.</p>
    </div>
  ),
});
