import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Save, X, Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_app/playbook")({
  component: PlaybookPage,
});

type ScriptRow = { id: string; title: string; body: string; sort_order: number };
type OfferRow = {
  id: string;
  name: string;
  type: string | null;
  cost: string | null;
  when_to_introduce: string | null;
  details: string | null;
  sort_order: number;
};
type TemplateRow = { id: string; slug: string; name: string; subject: string; body: string };

function PlaybookPage() {
  const { user } = useAuth();
  const [script, setScript] = useState<ScriptRow[]>([]);
  const [offers, setOffers] = useState<OfferRow[]>([]);
  const [templates, setTemplates] = useState<TemplateRow[]>([]);

  const refresh = () => {
    Promise.all([
      supabase.from("script_sections").select("*").order("sort_order"),
      supabase.from("offers").select("*").order("sort_order"),
      supabase.from("email_templates").select("*").order("name"),
    ]).then(([s, o, t]) => {
      setScript((s.data ?? []) as ScriptRow[]);
      setOffers((o.data ?? []) as OfferRow[]);
      setTemplates((t.data ?? []) as TemplateRow[]);
    });
  };

  useEffect(() => {
    refresh();
  }, []);

  const addTemplate = async () => {
    if (!user) {
      toast.error("Not signed in");
      return;
    }
    const slug = `custom_${Date.now()}`;
    const { data, error } = await supabase
      .from("email_templates")
      .insert({
        user_id: user.id,
        slug,
        name: "New Template",
        subject: "Subject line",
        body: "Email body…",
      })
      .select()
      .single();
    if (error) {
      toast.error(error.message);
      return;
    }
    setTemplates((prev) => [...prev, data as TemplateRow]);
    toast.success("Template created");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:px-8 space-y-10">
      <header>
        <h1 className="font-display text-3xl font-semibold">Playbook</h1>
        <p className="mt-1 text-muted-foreground">
          Your call script, offer stack, and email templates — fully editable.
        </p>
      </header>

      <Section title="Official Call Script">
        <div className="space-y-3">
          {script.map((s) => (
            <ScriptCard key={s.id} row={s} onChanged={refresh} />
          ))}
        </div>
      </Section>

      <Section title="Offer Stack">
        <div className="grid gap-3 md:grid-cols-2">
          {offers.map((o) => (
            <OfferCard key={o.id} row={o} onChanged={refresh} />
          ))}
        </div>
      </Section>

      <Section
        title="Email Templates"
        action={
          <Button size="sm" onClick={addTemplate}>
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New template
          </Button>
        }
      >
        <div className="space-y-3">
          {templates.map((t) => (
            <TemplateCard key={t.id} row={t} onChanged={refresh} />
          ))}
        </div>
      </Section>
    </div>
  );
}

function Section({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between border-b pb-2">
        <h2 className="font-display text-2xl font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ScriptCard({ row, onChanged }: { row: ScriptRow; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(row.title);
  const [body, setBody] = useState(row.body);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(row.title);
    setBody(row.body);
  }, [row.title, row.body]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("script_sections")
      .update({ title, body })
      .eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(false);
    onChanged();
  };

  return (
    <article className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      {editing ? (
        <div className="space-y-2">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} className="font-semibold" />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={10} />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1.5 h-3 w-3" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="mr-1.5 h-3 w-3" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-lg font-semibold">{row.title}</h3>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="mt-2 whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">
            {row.body}
          </pre>
        </>
      )}
    </article>
  );
}

function OfferCard({ row, onChanged }: { row: OfferRow; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [type, setType] = useState(row.type ?? "");
  const [cost, setCost] = useState(row.cost ?? "");
  const [whenIntro, setWhenIntro] = useState(row.when_to_introduce ?? "");
  const [details, setDetails] = useState(row.details ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(row.name);
    setType(row.type ?? "");
    setCost(row.cost ?? "");
    setWhenIntro(row.when_to_introduce ?? "");
    setDetails(row.details ?? "");
  }, [row]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("offers")
      .update({ name, type, cost, when_to_introduce: whenIntro, details })
      .eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(false);
    onChanged();
  };

  return (
    <article className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      {editing ? (
        <div className="space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
          <div className="grid grid-cols-2 gap-2">
            <Input value={type} onChange={(e) => setType(e.target.value)} placeholder="Type" />
            <Input value={cost} onChange={(e) => setCost(e.target.value)} placeholder="Cost" />
          </div>
          <Input
            value={whenIntro}
            onChange={(e) => setWhenIntro(e.target.value)}
            placeholder="When to introduce"
          />
          <Textarea value={details} onChange={(e) => setDetails(e.target.value)} rows={6} />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1.5 h-3 w-3" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="mr-1.5 h-3 w-3" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="font-display text-base font-semibold">{row.name}</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-muted-foreground">{row.cost}</span>
              <button
                onClick={() => setEditing(true)}
                className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
                title="Edit"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{row.type}</div>
          <p className="mt-2 text-xs italic text-muted-foreground">When: {row.when_to_introduce}</p>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground/90">{row.details}</pre>
        </>
      )}
    </article>
  );
}

function TemplateCard({ row, onChanged }: { row: TemplateRow; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(row.name);
  const [subject, setSubject] = useState(row.subject);
  const [body, setBody] = useState(row.body);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(row.name);
    setSubject(row.subject);
    setBody(row.body);
  }, [row]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("email_templates")
      .update({ name, subject, body })
      .eq("id", row.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    if (!confirm(`Delete template "${row.name}"?`)) return;
    const { error } = await supabase.from("email_templates").delete().eq("id", row.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    onChanged();
  };

  return (
    <article className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
      {editing ? (
        <div className="space-y-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Template name" />
          <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            className="font-sans text-sm"
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={saving}>
              <Save className="mr-1.5 h-3 w-3" /> {saving ? "Saving…" : "Save"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              <X className="mr-1.5 h-3 w-3" /> Cancel
            </Button>
            <Button size="sm" variant="ghost" onClick={remove} className="ml-auto text-destructive">
              <Trash2 className="mr-1.5 h-3 w-3" /> Delete
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-semibold">{row.name}</h3>
              <div className="mt-1 text-xs text-muted-foreground">
                Subject: <span className="font-mono">{row.subject}</span>
              </div>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </div>
          <pre className="mt-3 whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">
            {row.body}
          </pre>
        </>
      )}
    </article>
  );
}
