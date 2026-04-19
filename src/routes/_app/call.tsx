import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useCallback } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StageChip } from "@/components/StageChip";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { CallCockpit } from "@/components/CallCockpit";
import { STAGES, type Stage, stageLabel } from "@/lib/stages";
import { generateDbNoteLine } from "@/lib/dbNote";
import { applyTemplate } from "@/lib/templating";
import { Phone, Copy, Sparkles, Save, Calendar, Mail, Flame, ChevronLeft, FileText, CheckCircle2, ListChecks, Map } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const callSearchSchema = z.object({
  eventId: z.string().optional(),
});

export const Route = createFileRoute("/_app/call")({
  validateSearch: callSearchSchema,
  component: LiveCallWorkspace,
});

type EventRow = any;
type ScriptSection = { id: string; slug: string; title: string; body: string; sort_order: number };
type Offer = { id: string; slug: string; name: string; cost: string | null; when_to_introduce: string | null; details: string | null };
type Tmpl = { id: string; slug: string; name: string; subject: string; body: string };
type Contact = { id: string; name: string; email: string | null; phone: string | null };

function LiveCallWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [eventId, setEventId] = useState<string | undefined>(search.eventId);
  const [event, setEvent] = useState<EventRow | null>(null);
  const [contact, setContact] = useState<Contact | null>(null);
  const [scriptSections, setScriptSections] = useState<ScriptSection[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [templates, setTemplates] = useState<Tmpl[]>([]);
  const [savingField, setSavingField] = useState(false);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [dbLine, setDbLine] = useState("");
  const [summary, setSummary] = useState("");
  const [callType, setCallType] = useState("Discovery Call");
  const [outcome, setOutcome] = useState<string>("connected");
  const [followUpAt, setFollowUpAt] = useState<string>("");
  const [followUpAction, setFollowUpAction] = useState<string>("");
  const [mode, setMode] = useState<"free" | "guided">(() => {
    if (typeof window === "undefined") return "free";
    return (localStorage.getItem("callMode") as "free" | "guided") || "free";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("callMode", mode);
  }, [mode]);

  const saveContactField = useCallback(async (patch: Record<string, any>) => {
    if (!contact) return;
    setContact({ ...contact, ...patch } as Contact);
    const { error } = await supabase.from("contacts").update(patch as any).eq("id", contact.id);
    if (error) toast.error("Save failed: " + error.message);
  }, [contact]);

  // load all events for picker
  useEffect(() => {
    if (!user) return;
    supabase.from("events").select("*").order("updated_at", { ascending: false }).then(({ data }) => {
      setEvents(data ?? []);
      if (!eventId && data && data.length) setEventId(data[0].id);
    });
    supabase.from("script_sections").select("*").order("sort_order").then(({ data }) => setScriptSections((data ?? []) as any));
    supabase.from("offers").select("*").order("sort_order").then(({ data }) => setOffers((data ?? []) as any));
    supabase.from("email_templates").select("*").then(({ data }) => setTemplates((data ?? []) as any));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // load selected event detail + contact
  useEffect(() => {
    if (!eventId) { setEvent(null); setContact(null); return; }
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => {
      setEvent(data);
      if (data?.primary_contact_id) {
        supabase.from("contacts").select("*").eq("id", data.primary_contact_id).maybeSingle().then(({ data: c }) => setContact(c as any));
      } else {
        setContact(null);
      }
    });
    // sync URL
    navigate({ to: "/call", search: { eventId }, replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  // recompute template DB line whenever event changes
  useEffect(() => {
    if (event) setDbLine(generateDbNoteLine({ event, callType, pocName: contact?.name ?? "—" }));
  }, [event, contact, callType]);

  const saveEventField = useCallback(async (patch: Record<string, any>) => {
    if (!event) return;
    setSavingField(true);
    setEvent({ ...event, ...patch });
    const { error } = await supabase.from("events").update(patch as any).eq("id", event.id);
    setSavingField(false);
    if (error) toast.error("Save failed: " + error.message);
  }, [event]);

  const generateAiSummary = async () => {
    if (!event || !user) return;
    setGeneratingSummary(true);
    try {
      const { data, error } = await supabase.functions.invoke("db-summary", {
        body: {
          date: format(new Date(), "yyyy-MM-dd"),
          call_type: callType,
          poc: contact?.name ?? null,
          stage: stageLabel(event.stage as Stage),
          outcome,
          flags: {
            par3_booked: event.par3_booked,
            par5_booked: event.par5_booked,
            cgt_created: event.cgt_created,
            cgt_url: event.cgt_url,
            amateur_endorsement_sent: event.amateur_endorsement_sent,
            custom_products_sold: event.custom_products_sold,
            auction_referred: event.auction_referred,
            hot_lead: event.hot_lead,
          },
          where_left_off: event.where_left_off,
          summary_notes: summary,
          next_action: followUpAction,
          next_action_at: followUpAt,
          check_payable_to: event.check_payable_to,
          check_address: event.check_address,
        },
      });
      if (error) throw error;
      const line = (data as any)?.line as string | undefined;
      if (line) {
        setDbLine(line);
        toast.success("AI summary generated");
      } else {
        toast.info("AI returned empty — using template");
      }
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      if (msg.includes("429")) toast.error("Rate limited — try again in a moment");
      else if (msg.includes("402")) toast.error("AI credits exhausted");
      else toast.error("AI failed — using template fallback");
      // fallback already lives in dbLine
    } finally {
      setGeneratingSummary(false);
    }
  };

  const useTemplate = () => {
    if (!event) return;
    setDbLine(generateDbNoteLine({ event, callType, pocName: contact?.name ?? "—" }));
    toast.success("Using template summary");
  };

  const copyDbLine = async () => {
    await navigator.clipboard.writeText(dbLine);
    toast.success("Copied — paste into Dixon DB Notes field");
  };

  const saveCall = async () => {
    if (!event || !user) return;
    const ops: Promise<any>[] = [
      Promise.resolve(supabase.from("calls").insert({
        user_id: user.id,
        event_id: event.id,
        call_type: callType,
        outcome: outcome as any,
        summary: summary || null,
        db_note_line: dbLine || null,
      })),
      Promise.resolve(supabase.from("events").update({ last_contact_at: new Date().toISOString() }).eq("id", event.id)),
    ];
    if (followUpAt && followUpAction) {
      ops.push(Promise.resolve(supabase.from("tasks").insert({
        user_id: user.id,
        event_id: event.id,
        next_action: followUpAction,
        next_action_at: new Date(followUpAt).toISOString(),
      })));
    }
    const results = await Promise.all(ops);
    const err = results.find((r) => r.error)?.error;
    if (err) toast.error("Save failed: " + err.message);
    else {
      toast.success("Call logged");
      setSummary("");
      setFollowUpAction("");
      setFollowUpAt("");
    }
  };

  if (!event) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 md:px-8">
        <h1 className="font-display text-3xl font-semibold">Live Call Workspace</h1>
        <p className="mt-2 text-muted-foreground">No leads yet. Add one to start your first call.</p>
        <div className="mt-6"><AddLeadDialog onCreated={(id) => setEventId(id)} /></div>
      </div>
    );
  }

  const tmplVars = {
    contact_name: contact?.name ?? "",
    your_name: (user?.email ?? "").split("@")[0] ?? "",
    event_name: event.event_name,
    course: event.course ?? "",
    event_date: event.event_date ? format(new Date(event.event_date), "MMMM d, yyyy") : "",
    cgt_url: event.cgt_url ?? "",
    next_action_at: followUpAt ? format(new Date(followUpAt), "EEE MMM d 'at' h:mm a") : "",
  };

  return (
    <div className="flex h-screen flex-col md:h-[calc(100vh)]">
      {/* Top bar */}
      <div className="border-b bg-card/80 backdrop-blur px-3 py-2 md:px-6 md:py-3 flex items-center gap-3">
        <Button asChild size="sm" variant="ghost" className="md:hidden">
          <Link to="/"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <Select value={eventId} onValueChange={setEventId}>
          <SelectTrigger className="w-[220px] md:w-[320px]"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-[400px]">
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.event_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StageChip stage={event.stage as Stage} />
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant={event.hot_lead ? "default" : "outline"}
            onClick={() => saveEventField({ hot_lead: !event.hot_lead })}
            className={event.hot_lead ? "" : ""}
          >
            <Flame className="mr-1.5 h-3.5 w-3.5" />{event.hot_lead ? "Hot" : "Mark hot"}
          </Button>
          <span className="hidden md:inline text-xs text-muted-foreground">{savingField ? "Saving…" : "Saved"}</span>
        </div>
      </div>

      {/* 3-pane body */}
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[320px_1fr_360px] divide-y lg:divide-y-0 lg:divide-x">
        {/* LEFT: contact / event */}
        <ScrollArea className="lg:col-span-1 max-h-[40vh] lg:max-h-none">
          <div className="p-4 space-y-4">
            <div>
              <h2 className="font-display text-lg font-semibold">{event.event_name}</h2>
              <div className="mt-1 text-xs text-muted-foreground">
                {event.course || "—"}{event.event_date && ` · ${format(new Date(event.event_date), "MMM d, yyyy")}`}
              </div>
            </div>

            {contact && (
              <div className="rounded-lg border bg-card p-3 space-y-1.5">
                <div className="font-medium">{contact.name}</div>
                {contact.phone && (
                  <a href={`tel:${contact.phone}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline">
                    <Phone className="h-3.5 w-3.5" />{contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a href={`mailto:${contact.email}`} className="flex items-center gap-1.5 text-sm text-primary hover:underline truncate">
                    <Mail className="h-3.5 w-3.5" />{contact.email}
                  </a>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Field label="Players" value={event.player_count} onSave={(v) => saveEventField({ player_count: Number(v) || null })} type="number" />
              <Field label="Entry fee" value={event.entry_fee} onSave={(v) => saveEventField({ entry_fee: Number(v) || null })} type="number" prefix="$" />
            </div>
            <Field label="Stage" value={event.stage} type="select" onSave={(v) => saveEventField({ stage: v })} />
            <Field label="Where we left off" value={event.where_left_off} onSave={(v) => saveEventField({ where_left_off: v })} type="textarea" />
            <Field label="Pain points" value={event.pain_points} onSave={(v) => saveEventField({ pain_points: v })} type="textarea" />
            <Field label="Funds use" value={event.funds_use} onSave={(v) => saveEventField({ funds_use: v })} />
          </div>
        </ScrollArea>

        {/* CENTER: structured note capture */}
        <ScrollArea className="min-h-0">
          <div className="p-4 md:p-6 space-y-5 max-w-3xl mx-auto">
            <header>
              <h2 className="font-display text-xl font-semibold">Call Capture</h2>
              <p className="text-xs text-muted-foreground">Tick what happened. Everything saves to the lead immediately.</p>
            </header>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Call type</Label>
                <Select value={callType} onValueChange={setCallType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["Discovery Call", "Voicemail", "Follow-Up", "CGT Walkthrough", "Booking Confirm", "Check-In"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Outcome</Label>
                <Select value={outcome} onValueChange={setOutcome}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["connected", "voicemail", "no_answer", "wrong_number", "not_interested", "booked", "follow_up"].map((o) => (
                      <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <fieldset className="rounded-lg border bg-secondary/30 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interest</legend>
              <div className="grid grid-cols-2 gap-2">
                {[
                  ["interest_amateur_endorsement", "Amateur Endorsement"],
                  ["interest_par3", "Par 3 (Dixon Challenge)"],
                  ["interest_par5", "Par 5 (Aurelius Challenge)"],
                  ["interest_cgt", "CGT Platform"],
                  ["interest_custom_products", "Custom Products"],
                  ["interest_auction", "Auction Referral"],
                ].map(([k, l]) => (
                  <CheckRow key={k} label={l} checked={!!event[k]} onChange={(v) => saveEventField({ [k]: v })} />
                ))}
              </div>
            </fieldset>

            <fieldset className="rounded-lg border bg-secondary/30 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booked / Sent</legend>
              <div className="grid grid-cols-2 gap-2">
                <CheckRow label="AE Sent" checked={event.amateur_endorsement_sent} onChange={(v) => saveEventField({ amateur_endorsement_sent: v })} />
                <CheckRow label="Par 3 Booked" checked={event.par3_booked} onChange={(v) => saveEventField({ par3_booked: v })} />
                <CheckRow label="Par 5 Booked" checked={event.par5_booked} onChange={(v) => saveEventField({ par5_booked: v })} />
                <CheckRow label="CGT Created" checked={event.cgt_created} onChange={(v) => saveEventField({ cgt_created: v })} />
                <CheckRow label="Custom Products Sold" checked={event.custom_products_sold} onChange={(v) => saveEventField({ custom_products_sold: v })} />
                <CheckRow label="Auction Referred" checked={event.auction_referred} onChange={(v) => saveEventField({ auction_referred: v })} />
              </div>
              {event.cgt_created && (
                <div className="mt-2 grid gap-1.5">
                  <Label className="text-xs">CGT URL</Label>
                  <Input value={event.cgt_url ?? ""} onChange={(e) => setEvent({ ...event, cgt_url: e.target.value })} onBlur={(e) => saveEventField({ cgt_url: e.target.value })} placeholder="https://charitygolftoday.com/..." />
                </div>
              )}
            </fieldset>

            <fieldset className="rounded-lg border bg-secondary/30 p-3 space-y-2">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Check details</legend>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1">
                  <Label className="text-xs">Payable to</Label>
                  <Input defaultValue={event.check_payable_to ?? ""} onBlur={(e) => saveEventField({ check_payable_to: e.target.value })} />
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Mail to</Label>
                  <Input defaultValue={event.check_mail_to ?? ""} onBlur={(e) => saveEventField({ check_mail_to: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-1">
                <Label className="text-xs">Address</Label>
                <Input defaultValue={event.check_address ?? ""} onBlur={(e) => saveEventField({ check_address: e.target.value })} />
              </div>
            </fieldset>

            <div className="grid gap-1.5">
              <Label>Call summary</Label>
              <Textarea rows={4} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="What happened on this call? Key quotes, objections, decisions…" />
            </div>

            <fieldset className="rounded-lg border bg-secondary/30 p-3 space-y-2">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" />Schedule follow-up</span>
              </legend>
              <Input value={followUpAction} onChange={(e) => setFollowUpAction(e.target.value)} placeholder="Next action — e.g. 'Send CGT walkthrough'" />
              <Input type="datetime-local" value={followUpAt} onChange={(e) => setFollowUpAt(e.target.value)} />
            </fieldset>
          </div>
        </ScrollArea>

        {/* RIGHT: dynamic script + offers + templates */}
        <ScrollArea className="lg:col-span-1 max-h-[45vh] lg:max-h-none">
          <div className="p-4">
            <Tabs defaultValue="script" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="script">Script</TabsTrigger>
                <TabsTrigger value="offers">Offers</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>
              <TabsContent value="script" className="mt-3">
                <Accordion type="multiple" defaultValue={[scriptSections[0]?.slug]} className="w-full">
                  {scriptSections.map((s) => (
                    <AccordionItem key={s.id} value={s.slug}>
                      <AccordionTrigger className="text-left text-sm">{s.title}</AccordionTrigger>
                      <AccordionContent>
                        <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/85">{s.body}</pre>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </TabsContent>
              <TabsContent value="offers" className="mt-3 space-y-2">
                {offers.map((o) => (
                  <details key={o.id} className="rounded-lg border bg-card p-3 text-xs">
                    <summary className="flex cursor-pointer items-center justify-between font-medium text-sm">
                      <span>{o.name}</span>
                      <span className="font-mono text-muted-foreground text-[10px]">{o.cost}</span>
                    </summary>
                    <div className="mt-2 text-muted-foreground">{o.when_to_introduce}</div>
                    <pre className="mt-2 whitespace-pre-wrap font-sans">{o.details}</pre>
                  </details>
                ))}
              </TabsContent>
              <TabsContent value="email" className="mt-3 space-y-3">
                {templates.map((t) => {
                  const subj = applyTemplate(t.subject, tmplVars);
                  const body = applyTemplate(t.body, tmplVars);
                  const mailto = `mailto:${contact?.email ?? ""}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`;
                  return (
                    <article key={t.id} className="rounded-lg border bg-card p-3">
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Subject: {subj}</div>
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(body).then(() => toast.success("Body copied"))}>
                          <Copy className="mr-1.5 h-3 w-3" />Copy
                        </Button>
                        <Button asChild size="sm" variant="default" disabled={!contact?.email}>
                          <a href={mailto}><Mail className="mr-1.5 h-3 w-3" />Open</a>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      </div>

      {/* Bottom action bar — DB summary + save */}
      <div className="border-t bg-card px-3 py-3 md:px-6 md:py-4 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DB Note Line</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={useTemplate}>Template</Button>
            <Button size="sm" variant="outline" onClick={generateAiSummary} disabled={generatingSummary}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />{generatingSummary ? "Generating…" : "Generate w/ AI"}
            </Button>
            <Button size="sm" variant="default" onClick={copyDbLine}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />Copy
            </Button>
          </div>
        </div>
        <Textarea value={dbLine} onChange={(e) => setDbLine(e.target.value)} rows={2} className="font-mono text-xs" />
        <div className="flex justify-end">
          <Button onClick={saveCall}>
            <CheckCircle2 className="mr-1.5 h-4 w-4" />Log Call
          </Button>
        </div>
      </div>
    </div>
  );
}

function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-background cursor-pointer">
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} />
      {label}
    </label>
  );
}

function Field({
  label, value, onSave, type = "text", prefix,
}: {
  label: string;
  value: any;
  onSave: (v: any) => void;
  type?: "text" | "number" | "textarea" | "select";
  prefix?: string;
}) {
  const [v, setV] = useState<string>(value == null ? "" : String(value));
  useEffect(() => { setV(value == null ? "" : String(value)); }, [value]);

  if (type === "select") {
    return (
      <div className="grid gap-1">
        <Label className="text-xs">{label}</Label>
        <Select value={v} onValueChange={(nv) => { setV(nv); onSave(nv); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {STAGES.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (type === "textarea") {
    return (
      <div className="grid gap-1">
        <Label className="text-xs">{label}</Label>
        <Textarea
          rows={2}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== String(value ?? "") && onSave(v)}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        {prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{prefix}</span>}
        <Input
          type={type}
          className={prefix ? "pl-5" : ""}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== String(value ?? "") && onSave(v)}
        />
      </div>
    </div>
  );
}
