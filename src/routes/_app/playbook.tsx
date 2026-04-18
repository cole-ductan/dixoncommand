import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_app/playbook")({
  component: PlaybookPage,
});

function PlaybookPage() {
  const [script, setScript] = useState<any[]>([]);
  const [offers, setOffers] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from("script_sections").select("*").order("sort_order"),
      supabase.from("offers").select("*").order("sort_order"),
      supabase.from("email_templates").select("*").order("name"),
    ]).then(([s, o, t]) => {
      setScript(s.data ?? []);
      setOffers(o.data ?? []);
      setTemplates(t.data ?? []);
    });
  }, []);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 space-y-10">
      <header>
        <h1 className="font-display text-3xl font-semibold">Playbook</h1>
        <p className="mt-1 text-muted-foreground">Your call script, offer stack, and email templates — pulled from your Notion workspace.</p>
      </header>

      <Section title="Official Call Script">
        {script.map((s) => (
          <article key={s.id} className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg font-semibold">{s.title}</h3>
            <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">{s.body}</pre>
          </article>
        ))}
      </Section>

      <Section title="Offer Stack">
        <div className="grid gap-3 md:grid-cols-2">
          {offers.map((o) => (
            <article key={o.id} className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold">{o.name}</h3>
                <span className="text-xs font-mono text-muted-foreground">{o.cost}</span>
              </div>
              <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{o.type}</div>
              <p className="mt-2 text-xs italic text-muted-foreground">When: {o.when_to_introduce}</p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground/90">{o.details}</pre>
            </article>
          ))}
        </div>
      </Section>

      <Section title="Email Templates">
        {templates.map((t) => (
          <article key={t.id} className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
            <h3 className="font-display text-lg font-semibold">{t.name}</h3>
            <div className="mt-1 text-xs text-muted-foreground">Subject: <span className="font-mono">{t.subject}</span></div>
            <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">{t.body}</pre>
          </article>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-display text-2xl font-semibold border-b pb-2">{title}</h2>
      {children}
    </section>
  );
}
