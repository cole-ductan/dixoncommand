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
import { ScrollArea } from "@/components/ui/scroll-area";
import { StageChip } from "@/components/StageChip";
import { AddLeadDialog } from "@/components/AddLeadDialog";
import { CallCockpit } from "@/components/CallCockpit";
import { STAGES, type Stage, stageLabel } from "@/lib/stages";
import { generateDbNoteLine } from "@/lib/dbNote";
import { applyTemplate } from "@/lib/templating";
import { Phone, Copy, Sparkles, Save, Calendar, Mail, Flame, ChevronLeft, FileText, CheckCircle2, ListChecks, Map, PanelRightOpen, PanelRightClose, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LEAD_SOURCES } from "@/lib/leadSource";
import { OffersPanel } from "@/components/OffersPanel";
import { ScriptPanel } from "@/components/ScriptPanel";
import { usePendingTray } from "@/lib/pendingTrayStore";
import { DateTimePicker } from "@/components/DateTimePicker";
import { NextActionPicker } from "@/components/NextActionPicker";
import { openGCal } from "@/lib/gcal";
import { ResizablePanels3 } from "@/components/ResizablePanels3";
import { ResizablePanels2 } from "@/components/ResizablePanels2";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatPhone } from "@/lib/phone";
import { Plus, Trash2 } from "lucide-react";

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
  const [contacts, setContacts] = useState<Contact[]>([]);
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
  const [freePaneOpen, setFreePaneOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("callFreePaneOpen") !== "0";
  });
  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("callFreePaneOpen", freePaneOpen ? "1" : "0");
  }, [freePaneOpen]);

  const saveContactField = useCallback(async (patch: Record<string, any>) => {
    if (!contact) return;
    setContact({ ...contact, ...patch } as Contact);
    setContacts((prev) => prev.map((c) => (c.id === contact.id ? { ...c, ...patch } as Contact : c)));
    const { error } = await supabase.from("contacts").update(patch as any).eq("id", contact.id);
    if (error) toast.error("Save failed: " + error.message);
  }, [contact]);

  const updateContactById = useCallback(async (id: string, patch: Record<string, any>) => {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } as Contact : c)));
    if (contact?.id === id) setContact({ ...contact, ...patch } as Contact);
    const { error } = await supabase.from("contacts").update(patch as any).eq("id", id);
    if (error) toast.error("Save failed: " + error.message);
  }, [contact]);

  const addContact = useCallback(async () => {
    if (!event || !user) return;
    const { data, error } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        organization_id: event.organization_id ?? null,
        name: "New contact",
        email: null,
        phone: null,
      })
      .select()
      .single();
    if (error || !data) {
      toast.error("Couldn't add contact");
      return;
    }
    setContacts((prev) => [...prev, data as Contact]);
    toast.success("Contact added");
  }, [event, user]);

  const removeContact = useCallback(async (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    if (contact?.id === id) {
      setContact((prev) => {
        const remaining = contacts.filter((c) => c.id !== id);
        return remaining[0] ?? null;
      });
    }
    const { error } = await supabase.from("contacts").delete().eq("id", id);
    if (error) toast.error("Delete failed: " + error.message);
  }, [contact, contacts]);

  // load all events for picker
  useEffect(() => {
    supabase.from("events").select("*").eq("archived", false).order("updated_at", { ascending: false }).then(({ data }) => {
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
    if (!eventId) { setEvent(null); setContact(null); setContacts([]); return; }
    supabase.from("events").select("*").eq("id", eventId).maybeSingle().then(({ data }) => {
      setEvent(data);
      // Load all contacts for the org (or just primary if no org)
      const orgId = data?.organization_id;
      if (orgId) {
        supabase.from("contacts").select("*").eq("organization_id", orgId).order("created_at", { ascending: true })
          .then(({ data: rows }) => {
            const list = (rows ?? []) as Contact[];
            setContacts(list);
            const primary = list.find((c) => c.id === data?.primary_contact_id) ?? list[0] ?? null;
            setContact(primary);
          });
      } else if (data?.primary_contact_id) {
        supabase.from("contacts").select("*").eq("id", data.primary_contact_id).maybeSingle().then(({ data: c }) => {
          const one = c ? [c as Contact] : [];
          setContacts(one);
          setContact((c as any) ?? null);
        });
      } else {
        setContact(null);
        setContacts([]);
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
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-2 md:h-9 md:px-3">
                <PanelRightOpen className="h-3.5 w-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Script &amp; Offers</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col">
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="text-sm font-semibold">Script · Offers · Email</SheetTitle>
              </SheetHeader>
              <div className="flex-1 min-h-0 overflow-hidden">
                <CallRightPane
                  scriptSections={scriptSections}
                  setScriptSections={setScriptSections}
                  templates={templates}
                  tmplVars={{}}
                  contact={null}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div className="mx-auto max-w-2xl p-4 md:p-6">
            <InlineNewLead
              userId={user?.id ?? null}
              onCreated={(id) => setEventId(id)}
            />
          </div>
        </ScrollArea>
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
          {/* Mobile: open Script/Offers/Email in a slide-out sheet */}
          <Sheet>
            <SheetTrigger asChild>
              <Button size="sm" variant="outline" className="h-8 px-2 lg:hidden">
                <PanelRightOpen className="h-3.5 w-3.5 md:mr-1.5" />
                <span className="hidden md:inline">Script &amp; Offers</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-md md:max-w-lg p-0 flex flex-col">
              <SheetHeader className="border-b px-4 py-3">
                <SheetTitle className="text-sm font-semibold">Script · Offers · Email</SheetTitle>
              </SheetHeader>
              <div className="flex-1 min-h-0 overflow-hidden">
                <CallRightPane
                  scriptSections={scriptSections}
                  setScriptSections={setScriptSections}
                  templates={templates}
                  tmplVars={tmplVars}
                  contact={contact}
                />
              </div>
            </SheetContent>
          </Sheet>
          {/* Desktop: toggle the inline side pane (matches Guided) */}
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2 md:h-9 md:px-3 hidden lg:inline-flex"
            onClick={() => setFreePaneOpen((v) => !v)}
            title={freePaneOpen ? "Hide Script / Offers / Email" : "Show Script / Offers / Email"}
          >
            {freePaneOpen ? <PanelRightClose className="h-3.5 w-3.5 md:mr-1.5" /> : <PanelRightOpen className="h-3.5 w-3.5 md:mr-1.5" />}
            <span className="hidden md:inline">{freePaneOpen ? "Hide panes" : "Script & Offers"}</span>
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
      /* Free mode: merged main pane + side pane (Script/Offers/Email) like Guided. */
      <div className="flex-1 min-h-0">
        {(() => {
          const main = (
            <CallMainPane
              event={event}
              setEvent={setEvent}
              contacts={contacts}
              saveEventField={saveEventField}
              updateContactById={updateContactById}
              addContact={addContact}
              removeContact={removeContact}
              callType={callType}
              setCallType={setCallType}
              outcome={outcome}
              setOutcome={setOutcome}
              summary={summary}
              setSummary={setSummary}
              followUpAction={followUpAction}
              setFollowUpAction={setFollowUpAction}
              followUpAt={followUpAt}
              setFollowUpAt={setFollowUpAt}
            />
          );
          const side = (
            <CallRightPane
              scriptSections={scriptSections}
              setScriptSections={setScriptSections}
              templates={templates}
              tmplVars={tmplVars}
              contact={contact}
            />
          );
          return (
            <>
              {/* Mobile / tablet: main only (sheet handles side panel) */}
              <div className="h-full lg:hidden">{main}</div>
              {/* Desktop: resizable split when open, full-width main when closed */}
              <div className="hidden lg:block h-full">
                {freePaneOpen ? (
                  <ResizablePanels2
                    storageId="call-free-2pane-v1"
                    left={<div className="h-full">{main}</div>}
                    right={side}
                  />
                ) : (
                  main
                )}
              </div>
            </>
          );
        })()}
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

/* ---------- Pane components (extracted for reuse on mobile + resizable desktop) ---------- */

/**
 * Merged main pane: Event Snapshot (formerly the left rail) on top, followed by
 * the full Discovery Capture flow. Renders inside a single ScrollArea so the
 * whole call workspace is one scroll surface.
 */
function CallMainPane(props: {
  event: any;
  setEvent: (e: any) => void;
  contacts: Contact[];
  saveEventField: (patch: Record<string, any>) => void | Promise<void>;
  updateContactById: (id: string, patch: Record<string, any>) => void | Promise<void>;
  addContact: () => void | Promise<void>;
  removeContact: (id: string) => void | Promise<void>;
  callType: string;
  setCallType: (v: string) => void;
  outcome: string;
  setOutcome: (v: string) => void;
  summary: string;
  setSummary: (v: string) => void;
  followUpAction: string;
  setFollowUpAction: (v: string) => void;
  followUpAt: string;
  setFollowUpAt: (v: string) => void;
}) {
  const [snapshotOpen, setSnapshotOpen] = useState(true);
  return (
    <ScrollArea className="h-full @container">
      <div className="space-y-4 p-4 md:p-6 min-w-0 w-full">
        {/* Event Snapshot card (was the left pane) */}
        <section className="rounded-xl border bg-card overflow-hidden">
          <button
            type="button"
            onClick={() => setSnapshotOpen((v) => !v)}
            className="flex w-full items-center justify-between border-b bg-secondary/30 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
            aria-expanded={snapshotOpen}
          >
            <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Event Snapshot
            </h2>
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${snapshotOpen ? "" : "-rotate-90"}`}
            />
          </button>
          {snapshotOpen && (
          <div className="p-3 md:p-4 space-y-3 @container">
            <div className="grid grid-cols-1 @[520px]:grid-cols-2 gap-3">
              <Field
                label="Event name"
                value={props.event.event_name}
                onSave={(v) => props.saveEventField({ event_name: v || props.event.event_name })}
              />
              <OrgNameField event={props.event} />
            </div>

            {/* Primary contact */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Primary contact
                </Label>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-1.5 text-xs"
                  onClick={() => props.addContact()}
                >
                  <Plus className="h-3 w-3 mr-1" /> Add
                </Button>
              </div>
              {props.contacts.length === 0 && (
                <div className="rounded-lg border border-dashed bg-secondary/20 p-3 text-xs text-muted-foreground">
                  No contacts yet. Click <span className="font-medium">Add</span> to capture the POC.
                </div>
              )}
              <div className="grid grid-cols-1 @[520px]:grid-cols-2 gap-2">
                {props.contacts.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    onSave={(patch) => props.updateContactById(c.id, patch)}
                    onRemove={() => props.removeContact(c.id)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 @[520px]:grid-cols-2 gap-3">
              <Field
                label="Contact role / title"
                value={props.event.contact_role}
                onSave={(v) => props.saveEventField({ contact_role: v || null })}
              />
              <YesNoMaybeField
                label="Decision maker?"
                value={props.event.decision_maker}
                onSave={(v) => props.saveEventField({ decision_maker: v })}
              />
            </div>

            <div className="grid grid-cols-1 @[520px]:grid-cols-3 gap-3">
              <Field
                label="Event date"
                value={props.event.event_date}
                type="date"
                onSave={(v) => props.saveEventField({ event_date: v || null })}
              />
              <Field
                label="Registration time"
                value={props.event.registration_time}
                onSave={(v) => props.saveEventField({ registration_time: v || null })}
                placeholder="e.g. 7:00 AM"
              />
              <Field
                label="Tee off time"
                value={props.event.tee_off_time ?? props.event.event_time}
                onSave={(v) => props.saveEventField({ tee_off_time: v || null })}
                placeholder="e.g. 8:30 AM"
              />
            </div>

            <div className="grid grid-cols-1 @[520px]:grid-cols-3 gap-3">
              <Field
                label="Golf course"
                value={props.event.course}
                onSave={(v) => props.saveEventField({ course: v || null })}
              />
              <Field
                label="Est. golfers"
                value={props.event.player_count}
                onSave={(v) => props.saveEventField({ player_count: Number(v) || null })}
                type="number"
              />
              <Field
                label="Entry fee"
                value={props.event.entry_fee}
                onSave={(v) => props.saveEventField({ entry_fee: Number(v) || null })}
                type="number"
                prefix="$"
              />
            </div>

            <Field
              label="Event website / registration link"
              value={props.event.event_website}
              onSave={(v) => props.saveEventField({ event_website: v || null })}
              placeholder="https://"
            />

            <div className="grid grid-cols-1 @[520px]:grid-cols-2 gap-3">
              <Field
                label="Stage"
                value={props.event.stage}
                type="select"
                onSave={(v) => props.saveEventField({ stage: v })}
              />
              <Field
                label="Event ID"
                value={props.event.dixon_tournament_id}
                onSave={(v) => props.saveEventField({ dixon_tournament_id: v || null })}
              />
            </div>
          </div>
          )}
        </section>

        {/* Discovery Capture (was the center pane) */}
        <CallCenterPane
          embedded
          event={props.event}
          setEvent={props.setEvent}
          saveEventField={props.saveEventField}
          callType={props.callType}
          setCallType={props.setCallType}
          outcome={props.outcome}
          setOutcome={props.setOutcome}
          summary={props.summary}
          setSummary={props.setSummary}
          followUpAction={props.followUpAction}
          setFollowUpAction={props.setFollowUpAction}
          followUpAt={props.followUpAt}
          setFollowUpAt={props.setFollowUpAt}
        />
      </div>
    </ScrollArea>
  );
}

function CallLeftPane({
  event,
  contacts,
  saveEventField,
  updateContactById,
  addContact,
  removeContact,
}: {
  event: any;
  contacts: Contact[];
  saveEventField: (patch: Record<string, any>) => void | Promise<void>;
  updateContactById: (id: string, patch: Record<string, any>) => void | Promise<void>;
  addContact: () => void | Promise<void>;
  removeContact: (id: string) => void | Promise<void>;
}) {
  return (
    <ScrollArea className="h-full @container">
      <div className="p-4 lg:pr-4 space-y-4 min-w-0">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Event Snapshot
          </h2>
        </div>

        {/* Event identity */}
        <Field label="Event name" value={event.event_name} onSave={(v) => saveEventField({ event_name: v || event.event_name })} />
        <OrgNameField event={event} />

        {/* Primary contact */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Primary contact
            </Label>
            <Button size="sm" variant="ghost" className="h-6 px-1.5 text-xs" onClick={() => addContact()}>
              <Plus className="h-3 w-3 mr-1" /> Add
            </Button>
          </div>
          {contacts.length === 0 && (
            <div className="rounded-lg border border-dashed bg-secondary/20 p-3 text-xs text-muted-foreground">
              No contacts yet. Click <span className="font-medium">Add</span> to capture the POC.
            </div>
          )}
          {contacts.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              onSave={(patch) => updateContactById(c.id, patch)}
              onRemove={() => removeContact(c.id)}
            />
          ))}
        </div>

        {/* Contact role + decision maker — stored on the event for now */}
        <Field
          label="Contact role / title"
          value={event.contact_role}
          onSave={(v) => saveEventField({ contact_role: v || null })}
        />
        <YesNoMaybeField
          label="Decision maker?"
          value={event.decision_maker}
          onSave={(v) => saveEventField({ decision_maker: v })}
        />

        {/* Schedule */}
        <div className="grid grid-cols-1 @[260px]:grid-cols-2 gap-2">
          <Field label="Event date" value={event.event_date} type="date" onSave={(v) => saveEventField({ event_date: v || null })} />
          <Field label="Tee off time" value={event.tee_off_time ?? event.event_time} onSave={(v) => saveEventField({ tee_off_time: v || null })} placeholder="e.g. 8:30 AM" />
        </div>
        <Field
          label="Registration time"
          value={event.registration_time}
          onSave={(v) => saveEventField({ registration_time: v || null })}
          placeholder="e.g. 7:00 AM"
        />

        {/* Course + numbers */}
        <Field label="Golf course" value={event.course} onSave={(v) => saveEventField({ course: v || null })} />
        <div className="grid grid-cols-1 @[260px]:grid-cols-2 gap-2">
          <Field label="Est. golfers" value={event.player_count} onSave={(v) => saveEventField({ player_count: Number(v) || null })} type="number" />
          <Field label="Entry fee" value={event.entry_fee} onSave={(v) => saveEventField({ entry_fee: Number(v) || null })} type="number" prefix="$" />
        </div>

        {/* Website */}
        <Field
          label="Event website / registration link"
          value={event.event_website}
          onSave={(v) => saveEventField({ event_website: v || null })}
          placeholder="https://"
        />

        {/* Pipeline */}
        <Field label="Stage" value={event.stage} type="select" onSave={(v) => saveEventField({ stage: v })} />
        <Field label="Event ID" value={event.dixon_tournament_id} onSave={(v) => saveEventField({ dixon_tournament_id: v || null })} />
      </div>
    </ScrollArea>
  );
}

function CallCenterPane({
  event, setEvent, saveEventField, callType, setCallType, outcome, setOutcome,
  summary, setSummary, followUpAction, setFollowUpAction, followUpAt, setFollowUpAt,
  embedded = false,
}: any) {
  const body = (
    <div className={embedded ? "space-y-4 min-w-0" : "p-4 md:p-6 space-y-4 max-w-3xl mx-auto min-w-0"}>
        <header>
          <h2 className="font-display text-xl font-semibold">Discovery Capture</h2>
          <p className="text-xs text-muted-foreground">
            Walk through these grouped sections during the call. Everything saves to the lead immediately.
          </p>
        </header>

        <div className="grid grid-cols-1 @[420px]:grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs">Call type</Label>
            <Select value={callType} onValueChange={setCallType}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Discovery Call", "Voicemail", "Follow-Up", "CGT Walkthrough", "Booking Confirm", "Check-In"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Outcome</Label>
            <Select value={outcome} onValueChange={setOutcome}>
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["connected", "voicemail", "no_answer", "wrong_number", "not_interested", "booked", "follow_up"].map((o) => (
                  <SelectItem key={o} value={o}>{o.replace("_", " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* SECTION A — BACKGROUND */}
        <SectionCard letter="A" title="Background">
          <div className="grid grid-cols-1 @[420px]:grid-cols-2 gap-3">
            <YesNoMaybeField
              label="Annual event?"
              value={event.is_annual_event === true ? "yes" : event.is_annual_event === false ? "no" : null}
              onSave={(v) => saveEventField({ is_annual_event: v === "yes" ? true : v === "no" ? false : null })}
            />
            <Field
              label="Years event has run"
              type="number"
              value={event.years_running}
              onSave={(v) => saveEventField({ years_running: v === "" ? null : Number(v) })}
            />
          </div>
          <div className="grid grid-cols-1 @[420px]:grid-cols-2 gap-3">
            <Field
              label="Years organization has existed"
              type="number"
              value={event.org_age_years}
              onSave={(v) => saveEventField({ org_age_years: v === "" ? null : Number(v) })}
            />
            <Field
              label="Years contact involved"
              type="number"
              value={event.contact_years_involved}
              onSave={(v) => saveEventField({ contact_years_involved: v === "" ? null : Number(v) })}
            />
          </div>
          <Field
            label="Years contact in charge of tournament"
            type="number"
            value={event.contact_years_in_charge}
            onSave={(v) => saveEventField({ contact_years_in_charge: v === "" ? null : Number(v) })}
          />
          <Field
            label="How did they get involved?"
            type="textarea"
            value={event.contact_how_involved}
            onSave={(v) => saveEventField({ contact_how_involved: v || null })}
          />
          <div className="grid gap-1.5">
            <Label className="text-xs">Funds raised — specific use or general?</Label>
            <Select
              value={event.funds_use_type ?? ""}
              onValueChange={(v) => saveEventField({ funds_use_type: v || null })}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="specific">Specific use</SelectItem>
                <SelectItem value="general">General use</SelectItem>
                <SelectItem value="unknown">Not sure yet</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field
            label="Notes on funds use"
            type="textarea"
            value={event.funds_use_notes ?? event.funds_use}
            onSave={(v) => saveEventField({ funds_use_notes: v || null })}
          />
          <Field
            label="Overall goal this year"
            type="textarea"
            value={event.overall_goal}
            onSave={(v) => saveEventField({ overall_goal: v || null })}
          />
        </SectionCard>

        {/* SECTION B — EVENT FLOW */}
        <SectionCard letter="B" title="Event Flow">
          <div className="grid grid-cols-1 @[420px]:grid-cols-2 gap-3">
            <Field
              label="Registration opens"
              value={event.registration_opens_at ?? event.registration_time}
              onSave={(v) => saveEventField({ registration_opens_at: v || null })}
              placeholder="e.g. 7:00 AM"
            />
            <Field
              label="Tee off time"
              value={event.tee_off_time ?? event.event_time}
              onSave={(v) => saveEventField({ tee_off_time: v || null })}
              placeholder="e.g. 8:30 AM"
            />
          </div>
          <Field
            label="What is sold at registration?"
            type="textarea"
            value={event.registration_sales}
            onSave={(v) => saveEventField({ registration_sales: v || null })}
          />
          <Field
            label="Games currently run on the course"
            type="textarea"
            value={event.course_games}
            onSave={(v) => saveEventField({ course_games: v || null })}
          />
          <YesNoMaybeField
            label="Any games require an extra donation?"
            value={event.extra_donation_games === true ? "yes" : event.extra_donation_games === false ? "no" : null}
            onSave={(v) =>
              saveEventField({ extra_donation_games: v === "yes" ? true : v === "no" ? false : null })
            }
          />
          <Field
            label="Extra donation game notes"
            type="textarea"
            value={event.extra_donation_notes}
            onSave={(v) => saveEventField({ extra_donation_notes: v || null })}
          />
          <Field
            label="What happens after the round?"
            type="textarea"
            value={event.post_round_activities}
            onSave={(v) => saveEventField({ post_round_activities: v || null })}
          />
          <Field
            label="Other fundraising activities outside golf"
            type="textarea"
            value={event.extra_fundraising}
            onSave={(v) => saveEventField({ extra_fundraising: v || null })}
          />
        </SectionCard>

        {/* SECTION C — REVENUE + SPONSORSHIP */}
        <SectionCard letter="C" title="Revenue + Sponsorship">
          <ChipMultiSelect
            label="Revenue sources"
            options={[
              "sponsorships", "golfer fees", "raffles", "auctions", "mulligans",
              "on-course games", "donations", "merch", "other",
            ]}
            value={event.revenue_sources}
            onSave={(v) => saveEventField({ revenue_sources: v })}
          />
          <Field
            label="What do current sponsorships look like?"
            type="textarea"
            value={event.sponsorship_details}
            onSave={(v) => saveEventField({ sponsorship_details: v || null })}
          />
          <Field
            label="Who secures donated prizes?"
            value={event.prize_donor_lead}
            onSave={(v) => saveEventField({ prize_donor_lead: v || null })}
          />
          <Field
            label="Types of prizes / donations usually collected"
            type="textarea"
            value={event.prize_types}
            onSave={(v) => saveEventField({ prize_types: v || null })}
          />
          <div className="grid gap-1.5">
            <Label className="text-xs">Registration & payment processing</Label>
            <Select
              value={event.registration_method ?? ""}
              onValueChange={(v) => saveEventField({ registration_method: v || null })}
            >
              <SelectTrigger className="h-9"><SelectValue placeholder="Select…" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="paper">Paper / mail-in</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="website">Own website</SelectItem>
                <SelectItem value="eventbrite">Eventbrite</SelectItem>
                <SelectItem value="givebutter">Givebutter</SelectItem>
                <SelectItem value="cgt">Charity Golf Today</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Field
            label="Payment processor notes"
            type="textarea"
            value={event.payment_processor_notes}
            onSave={(v) => saveEventField({ payment_processor_notes: v || null })}
          />
          <YesNoMaybeField
            label="Budget for player gifts?"
            value={event.has_player_gift_budget}
            onSave={(v) => saveEventField({ has_player_gift_budget: v })}
          />
          <Field
            label="Player gift budget amount"
            value={event.player_gift_budget}
            onSave={(v) => saveEventField({ player_gift_budget: v || null })}
            placeholder="$ amount or per-player"
          />
          <Field
            label="Items usually purchased for players"
            type="textarea"
            value={event.player_gift_items}
            onSave={(v) => saveEventField({ player_gift_items: v || null })}
          />
        </SectionCard>

        {/* SECTION D — PAIN POINTS + FIT */}
        <SectionCard letter="D" title="Pain Points + Fit">
          <Field
            label="Hardest part about running the event"
            type="textarea"
            value={event.hardest_part ?? event.pain_points}
            onSave={(v) => saveEventField({ hardest_part: v || null })}
          />
          <ChipMultiSelect
            label="Pain points"
            options={[
              "sponsors", "golfer turnout", "logistics", "volunteers",
              "fundraising", "player engagement", "prizes/gifts", "admin",
              "payments", "other",
            ]}
            value={event.pain_point_chips}
            onSave={(v) => saveEventField({ pain_point_chips: v })}
          />
          <ChipMultiSelect
            label="Opportunity flags"
            options={["AE", "Par 3", "Par 5", "CGT", "Custom Products", "Auction Referral"]}
            value={event.opportunity_flags}
            onSave={(v) => saveEventField({ opportunity_flags: v })}
          />
        </SectionCard>

        {/* SECTION E — CALL OUTCOME */}
        <SectionCard letter="E" title="Call Outcome">
          <fieldset className="rounded-lg border bg-secondary/30 p-3">
            <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Interest</legend>
            <div className="grid grid-cols-1 @[360px]:grid-cols-2 gap-2">
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
            <div className="grid grid-cols-1 @[360px]:grid-cols-2 gap-2">
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
            <div className="grid grid-cols-1 @[360px]:grid-cols-2 gap-3">
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

          <Field
            label="Objections / concerns"
            type="textarea"
            value={event.objections}
            onSave={(v) => saveEventField({ objections: v || null })}
          />
          <Field
            label="Where we left off"
            type="textarea"
            value={event.where_left_off}
            onSave={(v) => saveEventField({ where_left_off: v || null })}
          />

          <div className="grid gap-1.5">
            <Label className="text-xs">Call summary</Label>
            <Textarea
              rows={4}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="What happened on this call? Key quotes, objections, decisions…"
            />
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
        </SectionCard>
    </div>
  );
  if (embedded) return body;
  return <ScrollArea className="h-full @container">{body}</ScrollArea>;
}

/** Grouped capture card with letter badge for sections A–E. */
function SectionCard({
  letter,
  title,
  children,
}: {
  letter: string;
  title: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  return (
    <section className="rounded-xl border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 border-b bg-secondary/30 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
        aria-expanded={open}
      >
        <span className="grid h-6 w-6 place-items-center rounded-md bg-primary text-[11px] font-bold text-primary-foreground">
          {letter}
        </span>
        <h3 className="font-display text-sm font-semibold flex-1">{title}</h3>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
        />
      </button>
      {open && <div className="p-3 space-y-3">{children}</div>}
    </section>
  );
}

function CallRightPane({ scriptSections, setScriptSections, templates, tmplVars, contact }: any) {
  return (
    <ScrollArea className="h-full @container">
      <div className="p-4 lg:pl-4 min-w-0">
            <Tabs defaultValue="script" className="w-full">
              <TabsList className="w-full grid grid-cols-3">
                <TabsTrigger value="script">Script</TabsTrigger>
                <TabsTrigger value="offers">Offers</TabsTrigger>
                <TabsTrigger value="email">Email</TabsTrigger>
              </TabsList>
              <TabsContent value="script" className="mt-3">
                <ScriptPanel
                  sections={scriptSections}
                  onUpdated={(u: ScriptSection) =>
                    setScriptSections((arr: ScriptSection[]) => arr.map((s) => (s.id === u.id ? u : s)))
                  }
                />
              </TabsContent>
              <TabsContent value="offers" className="mt-3">
                <OffersPanel variant="rail" />
              </TabsContent>
              <TabsContent value="email" className="mt-3 space-y-3">
                {templates.map((t: Tmpl) => {
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

/** Yes / No / Maybe segmented control bound to a string column. */
function YesNoMaybeField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: string | null | undefined;
  onSave: (v: string | null) => void | Promise<void>;
}) {
  const opts: { id: "yes" | "no" | "maybe"; label: string }[] = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
    { id: "maybe", label: "Maybe" },
  ];
  return (
    <div className="grid gap-1">
      <Label className="text-xs">{label}</Label>
      <div className="inline-flex rounded-md border bg-background p-0.5 w-fit">
        {opts.map((o) => {
          const active = value === o.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onSave(active ? null : o.id)}
              className={`px-3 py-1 text-xs font-medium rounded transition ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Multi-select chips bound to a TEXT[] column. */
function ChipMultiSelect({
  label,
  options,
  value,
  onSave,
}: {
  label: string;
  options: string[];
  value: string[] | null | undefined;
  onSave: (v: string[]) => void | Promise<void>;
}) {
  const selected = value ?? [];
  const toggle = (opt: string) => {
    const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
    onSave(next);
  };
  return (
    <div className="grid gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background text-foreground/80 hover:bg-secondary"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Edits the linked organization's name; falls back to read-only text if no org. */
function OrgNameField({ event }: { event: any }) {
  const [name, setName] = useState("");
  const [orgId, setOrgId] = useState<string | null>(event.organization_id ?? null);
  useEffect(() => {
    setOrgId(event.organization_id ?? null);
    if (event.organization_id) {
      supabase
        .from("organizations")
        .select("name")
        .eq("id", event.organization_id)
        .maybeSingle()
        .then(({ data }) => setName((data as any)?.name ?? ""));
    } else {
      setName("");
    }
  }, [event.organization_id]);

  const save = async () => {
    if (!orgId) return;
    if (!name.trim()) return;
    const { error } = await supabase.from("organizations").update({ name: name.trim() }).eq("id", orgId);
    if (error) toast.error("Save failed: " + error.message);
  };

  return (
    <div className="grid gap-1">
      <Label className="text-xs">Organization / charity name</Label>
      <Input
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        placeholder={orgId ? "Organization name" : "No organization linked"}
        disabled={!orgId}
      />
    </div>
  );
}

function ContactCard({
  contact,
  onSave,
  onRemove,
}: {
  contact: Contact;
  onSave: (patch: Record<string, any>) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}) {
  const [name, setName] = useState(contact.name ?? "");
  const [phone, setPhone] = useState(contact.phone ?? "");
  const [email, setEmail] = useState(contact.email ?? "");
  useEffect(() => { setName(contact.name ?? ""); }, [contact.name]);
  useEffect(() => { setPhone(contact.phone ?? ""); }, [contact.phone]);
  useEffect(() => { setEmail(contact.email ?? ""); }, [contact.email]);

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => name !== (contact.name ?? "") && onSave({ name: name.trim() || "New contact" })}
          placeholder="Contact name"
          className="h-8 text-sm font-medium flex-1"
        />
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove()}
          title="Remove contact"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center gap-1.5">
        <Phone className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Input
          value={phone}
          type="tel"
          inputMode="tel"
          onChange={(e) => setPhone(formatPhone(e.target.value))}
          onBlur={() => phone !== (contact.phone ?? "") && onSave({ phone: phone || null })}
          placeholder="(555) 010-1000"
          className="h-7 text-xs"
        />
      </div>
      <div className="flex items-center gap-1.5">
        <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Input
          value={email}
          type="email"
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email !== (contact.email ?? "") && onSave({ email: email.trim() || null })}
          placeholder="contact@org.com"
          className="h-7 text-xs"
        />
      </div>
    </div>
  );
}

function Field({
  label, value, onSave, type = "text", prefix, placeholder,
}: {
  label: string;
  value: any;
  onSave: (v: any) => void;
  type?: "text" | "number" | "textarea" | "select" | "date";
  prefix?: string;
  placeholder?: string;
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
          placeholder={placeholder}
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
          type={type === "date" ? "date" : type}
          className={prefix ? "pl-5" : ""}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== String(value ?? "") && onSave(v)}
          placeholder={placeholder}
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
  const [tournamentId, setTournamentId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!userId) {
      toast.error("Still connecting — try again in a second");
      return;
    }
    if (!eventName.trim()) {
      toast.error("Event name is required");
      return;
    }
    setSaving(true);
    try {
      let orgId: string | null = null;
      if (orgName.trim()) {
        const { data: org, error: oErr } = await supabase
          .from("organizations")
          .insert({ user_id: userId, name: orgName.trim() })
          .select().single();
        if (oErr) throw oErr;
        orgId = org.id;
      }

      let contactId: string | null = null;
      if (contactName.trim()) {
        const { data: c, error: cErr } = await supabase
          .from("contacts")
          .insert({
            user_id: userId,
            organization_id: orgId,
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
          organization_id: orgId,
          primary_contact_id: contactId,
          event_name: eventName.trim(),
          course: course.trim() || null,
          event_date: eventDate || null,
          player_count: playerCount.trim() ? Number(playerCount) : null,
          lead_source: leadSource || null,
          dixon_tournament_id: tournamentId.trim() || null,
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
          <Label htmlFor="il-event" className="text-xs">Event name *</Label>
          <Input id="il-event" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Annual Scholarship Classic" />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="il-org" className="text-xs">Organization</Label>
          <Input id="il-org" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="St. Vincent's Charity Foundation" />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="il-contact" className="text-xs">Contact name</Label>
            <Input id="il-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Sarah Mitchell" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="il-phone" className="text-xs">Phone</Label>
            <Input id="il-phone" type="tel" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(formatPhone(e.target.value))} placeholder="(555) 010-1000" />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="il-email" className="text-xs">Email</Label>
          <Input id="il-email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@org.com" />
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
          <Label htmlFor="il-eventid" className="text-xs">Event ID</Label>
          <Input id="il-eventid" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} placeholder="e.g. Dixon tournament ID" />
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
  const cockpit = (
    <CallCockpit
      event={event}
      contact={contact}
      onSaveEvent={saveEventField}
      onSaveContact={saveContactField}
    />
  );
  const sidePanel = (
    <ScrollArea className="h-full bg-background">
      <div className="p-3">
        <Tabs defaultValue="offers" className="w-full">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="script">Script</TabsTrigger>
            <TabsTrigger value="offers">Offers</TabsTrigger>
            <TabsTrigger value="email">Email</TabsTrigger>
          </TabsList>
          <TabsContent value="script" className="mt-3">
            <ScriptPanel sections={scriptSections} />
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
  );
  return (
    <div className="flex flex-1 min-h-0 relative px-4 lg:px-6">
      {/* Mobile: cockpit only */}
      <div className="flex-1 min-w-0 lg:hidden">{cockpit}</div>
      {/* Desktop: resizable when pane open, full-width cockpit when closed */}
      <div className="hidden lg:block flex-1 min-w-0">
        {paneOpen ? (
          <ResizablePanels2
            storageId="call-guided-2pane-v1"
            left={<div className="h-full">{cockpit}</div>}
            right={sidePanel}
          />
        ) : (
          cockpit
        )}
      </div>
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

