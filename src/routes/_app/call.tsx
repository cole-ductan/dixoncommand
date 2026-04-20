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
import { Phone, Copy, Sparkles, Save, Calendar, Mail, Flame, ChevronLeft, FileText, CheckCircle2, ListChecks, Map, PanelRightOpen, PanelRightClose } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LEAD_SOURCES } from "@/lib/leadSource";
import { OffersPanel } from "@/components/OffersPanel";
import { ScriptPanel } from "@/components/ScriptPanel";
import { usePendingTray } from "@/lib/pendingTrayStore";
import { DateTimePicker } from "@/components/DateTimePicker";
import { NextActionPicker } from "@/components/NextActionPicker";
import { openGCal } from "@/lib/gcal";

const callSearchSchema = z.object({
  eventId: z.string().optional(),
  new: z.union([z.literal("1"), z.literal(1), z.boolean()]).optional(),
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

const INTEREST_LABELS: Record<string, string> = {
  interest_amateur_endorsement: "Amateur Endorsement",
  interest_par3: "Par 3 (Dixon Challenge)",
  interest_par5: "Par 5 (Aurelius Challenge)",
  interest_cgt: "CGT Platform",
  interest_custom_products: "Custom Products",
  interest_auction: "Auction Referral",
};

function appendInterestNote(existing: string | null | undefined, label: string): string {
  const line = `Interested in ${label} — needs follow-up`;
  const current = existing ?? "";
  if (current.includes(line)) return current;
  return current.trim().length === 0 ? line : `${current.trimEnd()}\n${line}`;
}

function LiveCallWorkspace() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [events, setEvents] = useState<EventRow[]>([]);
  const [forceNew, setForceNew] = useState<boolean>(!!search.new);
  const [eventId, setEventId] = useState<string | undefined>(search.new ? undefined : search.eventId);
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
    supabase.from("events").select("*").order("updated_at", { ascending: false }).then(({ data }) => {
      setEvents(data ?? []);
      // Only auto-select first event if not explicitly starting a new lead
      if (!eventId && !forceNew && data && data.length) setEventId(data[0].id);
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
    setForceNew(false);
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

  // No event yet → render the cockpit shell with the new-lead form in the left pane.
  if (!event) {
    return (
      <div className="flex h-screen flex-col">
        <div className="border-b bg-card/80 backdrop-blur px-3 py-2 md:px-6 md:py-3 flex items-center gap-3">
          <Button asChild size="sm" variant="ghost" className="md:hidden">
            <Link to="/"><ChevronLeft className="h-4 w-4" /></Link>
          </Button>
          {events.length > 0 ? (
            <Select
              value={eventId ?? ""}
              onValueChange={(v) => { if (v === "__new__") { setEventId(undefined); setForceNew(true); } else setEventId(v); }}
            >
              <SelectTrigger className="w-[220px] md:w-[320px]">
                <SelectValue placeholder="Pick a lead…" />
              </SelectTrigger>
              <SelectContent className="max-h-[400px]">
                <SelectItem value="__new__" className="font-medium text-primary">+ Add lead</SelectItem>
                <div className="my-1 border-t" />
                {events.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.event_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm font-medium">New Call</div>
          )}
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
            New Lead
          </span>
          <div className="ml-auto text-xs text-muted-foreground hidden md:inline">
            Fill the lead card on the left to start
          </div>
        </div>

        <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[360px_1fr_360px] divide-y lg:divide-y-0 lg:divide-x">
          <ScrollArea className="min-h-0">
            <InlineNewLead
              userId={user?.id ?? null}
              onCreated={(id) => setEventId(id)}
            />
          </ScrollArea>

          <ScrollArea className="min-h-0">
            <div className="p-4 md:p-6 max-w-2xl mx-auto">
              <div className="rounded-xl border-2 border-dashed bg-secondary/20 p-8 text-center">
                <Phone className="mx-auto h-8 w-8 text-muted-foreground/60" />
                <h3 className="mt-3 font-display text-lg font-semibold">Capture starts here</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Save the lead on the left and the call cockpit — interest flags, booked/sent, follow-up scheduling, AI summary — opens up instantly.
                </p>
              </div>
            </div>
          </ScrollArea>

          <ScrollArea className="min-h-0">
            <div className="p-4">
              <Tabs defaultValue="script" className="w-full">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="script">Script</TabsTrigger>
                  <TabsTrigger value="offers">Offers</TabsTrigger>
                  <TabsTrigger value="email">Email</TabsTrigger>
                </TabsList>
                <TabsContent value="script" className="mt-3">
                  <ScriptPanel
                    sections={scriptSections}
                    onUpdated={(u) => setScriptSections((arr) => arr.map((s) => (s.id === u.id ? u : s)))}
                  />
                </TabsContent>
                <TabsContent value="offers" className="mt-3">
                  <OffersPanel variant="rail" />
                </TabsContent>
                <TabsContent value="email" className="mt-3 text-xs text-muted-foreground">
                  Save a lead to personalize email templates.
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>
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
    <div className="flex min-h-[calc(100vh-88px)] md:h-screen flex-col">
      {/* Top bar */}
      <div className="border-b bg-card/80 backdrop-blur px-3 py-2 md:px-6 md:py-3 flex flex-wrap items-center gap-2 md:gap-3">
        <Button asChild size="sm" variant="ghost" className="md:hidden h-8 w-8 p-0">
          <Link to="/"><ChevronLeft className="h-4 w-4" /></Link>
        </Button>
        <Select
          value={eventId}
          onValueChange={(v) => { if (v === "__new__") { setEventId(undefined); setForceNew(true); } else setEventId(v); }}
        >
          <SelectTrigger className="w-[160px] md:w-[320px] h-8 md:h-10 text-xs md:text-sm"><SelectValue /></SelectTrigger>
          <SelectContent className="max-h-[400px]">
            <SelectItem value="__new__" className="font-medium text-primary">+ Add lead</SelectItem>
            <div className="my-1 border-t" />
            {events.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.event_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <StageChip stage={event.stage as Stage} />
        <div className="ml-auto flex items-center gap-2">
          {/* Free / Guided mode toggle */}
          <div className="hidden sm:flex items-center rounded-md border bg-background p-0.5">
            <button
              onClick={() => setMode("free")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
                mode === "free" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={mode === "free"}
            >
              <ListChecks className="h-3 w-3" /> Free
            </button>
            <button
              onClick={() => setMode("guided")}
              className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium transition ${
                mode === "guided" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={mode === "guided"}
            >
              <Map className="h-3 w-3" /> Guided
            </button>
          </div>
          <Button
            size="sm"
            variant={event.hot_lead ? "default" : "outline"}
            onClick={() => saveEventField({ hot_lead: !event.hot_lead })}
            className="h-8 px-2 md:h-9 md:px-3"
          >
            <Flame className="h-3.5 w-3.5 md:mr-1.5" />
            <span className="hidden md:inline">{event.hot_lead ? "Hot" : "Mark hot"}</span>
          </Button>
          <span className="hidden md:inline text-xs text-muted-foreground">{savingField ? "Saving…" : "Saved"}</span>
        </div>
      </div>

      {mode === "guided" ? (
        <GuidedWithSidePanes
          event={event}
          contact={contact}
          saveEventField={saveEventField}
          saveContactField={saveContactField}
          scriptSections={scriptSections}
          templates={templates}
          tmplVars={tmplVars}
        />
      ) : (
      /* 3-pane body — on mobile we stack naturally so each pane shows in full */
      <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-[320px_1fr_360px] divide-y lg:divide-y-0 lg:divide-x">
        {/* LEFT: contact / event */}
        <ScrollArea className="lg:col-span-1 lg:max-h-none">
          <div className="p-4 lg:pl-6 space-y-4">
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
                  <CheckRow
                    key={k}
                    label={l}
                    checked={!!event[k]}
                    onChange={(v) => {
                      const patch: Record<string, any> = { [k]: v };
                      // When toggling ON, append an "Interested in ... — needs follow-up" line to notes (deduped)
                      if (v && INTEREST_LABELS[k] && !event[k]) {
                        patch.notes = appendInterestNote(event.notes, INTEREST_LABELS[k]);
                      }
                      saveEventField(patch);
                    }}
                  />
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
              <NextActionPicker value={followUpAction} onChange={setFollowUpAction} />
              <DateTimePicker value={followUpAt} onChange={setFollowUpAt} placeholder="Pick follow-up date" />
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="w-full"
                disabled={!followUpAt || !followUpAction}
                onClick={() => {
                  openGCal({
                    title: `${followUpAction}${event ? ` — ${event.event_name}` : ""}`,
                    details: [
                      event?.event_name && `Lead: ${event.event_name}`,
                      event?.course && `Course: ${event.course}`,
                      summary && `\nNotes:\n${summary}`,
                    ].filter(Boolean).join("\n"),
                    start: new Date(followUpAt),
                  });
                }}
              >
                <Calendar className="mr-1.5 h-3.5 w-3.5" /> Add to Google Calendar
              </Button>
            </fieldset>
          </div>
        </ScrollArea>

        {/* RIGHT: dynamic script + offers + templates */}
        <ScrollArea className="lg:col-span-1 lg:max-h-none">
          <div className="p-4 pr-6">
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
              <TabsContent value="offers" className="mt-3">
                <OffersPanel variant="rail" />
              </TabsContent>
              <TabsContent value="email" className="mt-3 space-y-3">
                {templates.map((t) => {
                  const subj = applyTemplate(t.subject, tmplVars);
                  const body = applyTemplate(t.body, tmplVars);
                  return (
                    <article key={t.id} className="rounded-lg border bg-card p-3">
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Subject: {subj}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigator.clipboard.writeText(body).then(() => toast.success("Body copied"))}
                        >
                          <Copy className="mr-1.5 h-3 w-3" />Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            usePendingTray.getState().setTo(contact?.email ?? "");
                            usePendingTray.getState().add({
                              kind: "template",
                              id: t.id,
                              name: t.name,
                              subject: subj,
                              body,
                            });
                            toast.success(`Added "${t.name}" to email tray`);
                          }}
                        >
                          <Mail className="mr-1.5 h-3 w-3" />Add to tray
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
      )}

      {/* Bottom action bar — DB summary + save */}
      <div className="border-t bg-card px-3 py-3 md:px-6 md:py-4 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">DB Note</span>
          <div className="ml-auto flex flex-wrap gap-1.5">
            <Button size="sm" variant="outline" className="h-8" onClick={useTemplate}>Template</Button>
            <Button size="sm" variant="outline" className="h-8" onClick={generateAiSummary} disabled={generatingSummary}>
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              <span className="hidden sm:inline">{generatingSummary ? "Generating…" : "Generate w/ AI"}</span>
              <span className="sm:hidden">{generatingSummary ? "…" : "AI"}</span>
            </Button>
            <Button size="sm" variant="default" className="h-8" onClick={copyDbLine}>
              <Copy className="mr-1 h-3.5 w-3.5" />Copy
            </Button>
          </div>
        </div>
        <Textarea value={dbLine} onChange={(e) => setDbLine(e.target.value)} rows={2} className="font-mono text-xs" />
        <div className="flex justify-end">
          <Button size="sm" onClick={saveCall}>
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

function InlineNewLead({
  userId,
  onCreated,
}: {
  userId: string | null;
  onCreated: (id: string) => void;
}) {
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [course, setCourse] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [playerCount, setPlayerCount] = useState("");
  const [leadSource, setLeadSource] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!userId) {
      toast.error("Still connecting — try again in a second");
      return;
    }
    if (!eventName.trim() || !orgName.trim()) {
      toast.error("Organization and Event name are required");
      return;
    }
    setSaving(true);
    try {
      const { data: org, error: oErr } = await supabase
        .from("organizations")
        .insert({ user_id: userId, name: orgName.trim() })
        .select().single();
      if (oErr) throw oErr;

      let contactId: string | null = null;
      if (contactName.trim()) {
        const { data: c, error: cErr } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            organization_id: org.id,
            name: contactName.trim(),
            email: contactEmail.trim() || null,
            phone: contactPhone.trim() || null,
          })
          .select().single();
        if (cErr) throw cErr;
        contactId = c.id;
      }

      const { data: ev, error: eErr } = await supabase
        .from("events")
        .insert({
          user_id: userId,
          organization_id: org.id,
          primary_contact_id: contactId,
          event_name: eventName.trim(),
          course: course.trim() || null,
          event_date: eventDate || null,
          player_count: playerCount.trim() ? Number(playerCount) : null,
          lead_source: leadSource || null,
          notes: notes.trim() || null,
          stage: "new_lead",
        })
        .select().single();
      if (eErr) throw eErr;

      toast.success("Lead added — entering call");
      onCreated(ev.id);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div>
        <h2 className="font-display text-lg font-semibold">New lead</h2>
        <p className="text-xs text-muted-foreground">
          Save to unlock the full cockpit. You can fill the rest while on the call.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="il-org" className="text-xs">Organization *</Label>
          <Input id="il-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="St. Vincent's Charity Foundation" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="il-contact" className="text-xs">Contact name</Label>
            <Input id="il-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Sarah Mitchell" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="il-phone" className="text-xs">Phone</Label>
            <Input id="il-phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(555) 010-1000" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="il-email" className="text-xs">Email</Label>
          <Input id="il-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@org.com" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="il-event" className="text-xs">Event name *</Label>
          <Input id="il-event" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Annual Scholarship Classic" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="il-course" className="text-xs">Golf course</Label>
            <Input id="il-course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Pebble Creek GC" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="il-date" className="text-xs">Event date</Label>
            <Input id="il-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="il-players" className="text-xs"># of Players</Label>
            <Input id="il-players" type="number" min="0" value={playerCount} onChange={(e) => setPlayerCount(e.target.value)} placeholder="Est. player count" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="il-source" className="text-xs">Lead Source</Label>
            <Select value={leadSource} onValueChange={setLeadSource}>
              <SelectTrigger id="il-source"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                {LEAD_SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="il-notes" className="text-xs">Notes</Label>
          <Textarea id="il-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you want to remember…" />
        </div>

        <Button onClick={submit} disabled={saving} className="w-full mt-1">
          <Phone className="mr-2 h-4 w-4" />{saving ? "Creating…" : "Save & Start Call"}
        </Button>
      </div>
    </div>
  );
}

function GuidedWithSidePanes({
  event,
  contact,
  saveEventField,
  saveContactField,
  scriptSections,
  templates,
  tmplVars,
}: {
  event: any;
  contact: any;
  saveEventField: (patch: Record<string, any>) => Promise<void> | void;
  saveContactField: (patch: Record<string, any>) => Promise<void> | void;
  scriptSections: ScriptSection[];
  templates: Tmpl[];
  tmplVars: Record<string, string>;
}) {
  const [paneOpen, setPaneOpen] = useState(false);
  return (
    <div className="flex flex-1 min-h-0 relative">
      <div className="flex-1 min-w-0">
        <CallCockpit
          event={event}
          contact={contact}
          onSaveEvent={saveEventField}
          onSaveContact={saveContactField}
        />
      </div>
      {paneOpen && (
        <ScrollArea className="hidden lg:block w-[360px] shrink-0 border-l bg-background">
          <div className="p-3">
            <Tabs defaultValue="offers" className="w-full">
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
              <TabsContent value="offers" className="mt-3">
                <OffersPanel variant="rail" />
              </TabsContent>
              <TabsContent value="email" className="mt-3 space-y-3">
                {templates.map((t) => {
                  const subj = applyTemplate(t.subject, tmplVars);
                  const body = applyTemplate(t.body, tmplVars);
                  return (
                    <article key={t.id} className="rounded-lg border bg-card p-3">
                      <div className="font-medium text-sm">{t.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Subject: {subj}</div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => {
                            usePendingTray.getState().setTo(contact?.email ?? "");
                            usePendingTray.getState().add({
                              kind: "template",
                              id: t.id,
                              name: t.name,
                              subject: subj,
                              body,
                            });
                            toast.success(`Added "${t.name}" to email tray`);
                          }}
                        >
                          <Mail className="mr-1.5 h-3 w-3" />Add to tray
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </TabsContent>
            </Tabs>
          </div>
        </ScrollArea>
      )}
      <button
        onClick={() => setPaneOpen((v) => !v)}
        className="hidden lg:flex absolute top-3 right-3 z-10 items-center gap-1.5 rounded-md border bg-card px-2.5 py-1.5 text-xs font-medium shadow-sm hover:bg-secondary"
        title={paneOpen ? "Hide panes" : "Show Script / Offers / Email"}
      >
        {paneOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <PanelRightOpen className="h-3.5 w-3.5" />}
        {paneOpen ? "Hide" : "Panes"}
      </button>
    </div>
  );
}

