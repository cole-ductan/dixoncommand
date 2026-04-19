import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  PIPELINE_STEPS,
  STEP_BY_SLUG,
  OBJECTIONS,
  type CaptureField,
  type PipelineStep,
} from "@/lib/pipeline";
import { ChevronRight, Phone, PhoneOff, Mic, AlertTriangle, CheckCircle2, Timer } from "lucide-react";

type AnyEvent = Record<string, any>;
type AnyContact = Record<string, any> | null;

interface Props {
  event: AnyEvent;
  contact: AnyContact;
  onSaveEvent: (patch: Record<string, unknown>) => Promise<void> | void;
  onSaveContact: (patch: Record<string, unknown>) => Promise<void> | void;
}

const FIELD_META: Record<CaptureField, { label: string; type: "text" | "number" | "textarea" | "boolean" | "date" | "time"; on: "event" | "contact" }> = {
  event_name: { label: "Tournament name", type: "text", on: "event" },
  course: { label: "Golf course", type: "text", on: "event" },
  event_date: { label: "Event date", type: "date", on: "event" },
  event_time: { label: "Shotgun start time", type: "time", on: "event" },
  player_count: { label: "Expected players", type: "number", on: "event" },
  entry_fee: { label: "Entry fee ($)", type: "number", on: "event" },
  funds_use: { label: "Funds use", type: "text", on: "event" },
  pain_points: { label: "Pain points", type: "textarea", on: "event" },
  sponsorship_details: { label: "Current sponsorships", type: "textarea", on: "event" },
  registration_method: { label: "Registration method", type: "text", on: "event" },
  player_gift_budget: { label: "Player gift budget", type: "text", on: "event" },
  event_website: { label: "Event website", type: "text", on: "event" },
  amateur_endorsement_sent: { label: "AE Sent", type: "boolean", on: "event" },
  interest_par3: { label: "Interested in Par 3", type: "boolean", on: "event" },
  interest_par5: { label: "Interested in Par 5", type: "boolean", on: "event" },
  par3_booked: { label: "Par 3 Booked", type: "boolean", on: "event" },
  par5_booked: { label: "Par 5 Booked", type: "boolean", on: "event" },
  check_payable_to: { label: "Check payable to", type: "text", on: "event" },
  check_mail_to: { label: "Mail to (name)", type: "text", on: "event" },
  check_address: { label: "Check address", type: "textarea", on: "event" },
  cgt_created: { label: "CGT Created", type: "boolean", on: "event" },
  cgt_url: { label: "CGT URL", type: "text", on: "event" },
  custom_products_sold: { label: "Custom Products Sold", type: "boolean", on: "event" },
  auction_referred: { label: "Auction Referred", type: "boolean", on: "event" },
  where_left_off: { label: "Where we left off", type: "textarea", on: "event" },
  contact_name: { label: "POC name", type: "text", on: "contact" },
  contact_email: { label: "POC email", type: "text", on: "contact" },
  contact_phone: { label: "POC phone", type: "text", on: "contact" },
};

const CONTACT_FIELD_KEY: Partial<Record<CaptureField, string>> = {
  contact_name: "name",
  contact_email: "email",
  contact_phone: "phone",
};

export function CallCockpit({ event, contact, onSaveEvent, onSaveContact }: Props) {
  const [stepSlug, setStepSlug] = useState<string>("pre_call");
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [callState, setCallState] = useState<"idle" | "ringing" | "live" | "vm" | "ended">("idle");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [showObjections, setShowObjections] = useState(false);

  const step: PipelineStep = STEP_BY_SLUG[stepSlug] ?? PIPELINE_STEPS[0];

  // tick the timer when live
  useEffect(() => {
    if (callState !== "live") return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [callState]);

  const elapsed = useMemo(() => {
    if (!startedAt) return "00:00";
    const s = Math.max(0, Math.floor((now - startedAt) / 1000));
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = (s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  }, [startedAt, now]);

  const goto = async (slug: string, patch?: Record<string, unknown>) => {
    if (patch) await onSaveEvent(patch);
    setCompleted((c) => ({ ...c, [stepSlug]: true }));
    setStepSlug(slug);
  };

  const callAction = (s: typeof callState) => {
    setCallState(s);
    if (s === "live") {
      setStartedAt(Date.now());
      if (stepSlug === "pre_call" || stepSlug === "voicemail") setStepSlug("intro");
    } else if (s === "vm") {
      setStepSlug("voicemail");
    } else if (s === "ended") {
      setStartedAt(null);
      setStepSlug("wrap");
    }
  };

  return (
    <div className="grid h-full grid-cols-1 lg:grid-cols-[260px_1fr] min-h-0">
      {/* Step rail */}
      <ScrollArea className="border-b lg:border-b-0 lg:border-r bg-secondary/20 max-h-[35vh] lg:max-h-none">
        <div className="p-2 space-y-0.5">
          {PIPELINE_STEPS.map((s) => {
            const isActive = s.slug === stepSlug;
            const isDone = completed[s.slug];
            return (
              <button
                key={s.slug}
                onClick={() => setStepSlug(s.slug)}
                className={`w-full flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "hover:bg-background/80 text-foreground/80"
                }`}
              >
                <span className="text-base leading-none">{s.emoji}</span>
                <span className="flex-1 truncate">
                  <span className="text-[10px] font-mono opacity-70 mr-1.5">
                    {s.number === "PRE" ? "PRE" : String(s.number).padStart(2, "0")}
                  </span>
                  {s.title.replace(/^Step \d+ — /, "").replace(/^Pre-Call — /, "")}
                </span>
                {isDone && !isActive && <CheckCircle2 className="h-3.5 w-3.5 opacity-60" />}
              </button>
            );
          })}
        </div>
      </ScrollArea>

      {/* Active step pane */}
      <ScrollArea className="min-h-0">
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
          {/* Call control bar */}
          <div className="rounded-xl border bg-card p-3 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <Timer className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono text-sm tabular-nums">{elapsed}</span>
              {callState === "live" && (
                <span className="ml-1 inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </div>
            <Button
              size="sm"
              variant={callState === "live" ? "default" : "outline"}
              onClick={() => callAction("live")}
            >
              <Phone className="mr-1.5 h-3.5 w-3.5" />Picked Up
            </Button>
            <Button size="sm" variant="outline" onClick={() => callAction("vm")}>
              <Mic className="mr-1.5 h-3.5 w-3.5" />Left Voicemail
            </Button>
            <Button size="sm" variant="outline" onClick={() => callAction("ended")}>
              <PhoneOff className="mr-1.5 h-3.5 w-3.5" />End Call
            </Button>
            <Button
              size="sm"
              variant={showObjections ? "default" : "ghost"}
              className="ml-auto"
              onClick={() => setShowObjections((v) => !v)}
            >
              <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
              Objections
            </Button>
          </div>

          {/* Header */}
          <header className="space-y-1">
            <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
              {step.number === "PRE" ? "Pre-Call" : `Step ${step.number} of 13`}
            </div>
            <h2 className="font-display text-2xl font-semibold flex items-center gap-2">
              <span>{step.emoji}</span>
              {step.title.replace(/^Step \d+ — /, "").replace(/^Pre-Call — /, "")}
            </h2>
            {step.subtitle && <p className="text-sm text-muted-foreground">{step.subtitle}</p>}
          </header>

          {/* Callout */}
          {step.callout && (
            <div
              className={`rounded-lg border p-3 text-sm ${
                step.callout.tone === "critical"
                  ? "border-red-500/40 bg-red-500/5 text-red-900 dark:text-red-200"
                  : step.callout.tone === "warn"
                    ? "border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200"
                    : "border-primary/30 bg-primary/5 text-foreground"
              }`}
            >
              {step.callout.text}
            </div>
          )}

          {/* Objections drawer */}
          {showObjections && (
            <div className="rounded-xl border bg-card p-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-display text-sm font-semibold">Objection Quick-Reference</h3>
                <Button size="sm" variant="ghost" onClick={() => setShowObjections(false)}>Close</Button>
              </div>
              <Accordion type="single" collapsible className="w-full">
                {OBJECTIONS.map((o) => (
                  <AccordionItem key={o.slug} value={o.slug}>
                    <AccordionTrigger className="text-left text-sm">{o.trigger}</AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm text-foreground/85">{o.response}</p>
                      {o.tip && <p className="mt-2 text-xs italic text-muted-foreground">Tip: {o.tip}</p>}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          )}

          {/* Script */}
          {step.scriptLines && step.scriptLines.length > 0 && (
            <div className="space-y-2">
              {step.scriptLines.map((line, i) => (
                <blockquote
                  key={i}
                  className="rounded-lg border-l-4 border-primary bg-secondary/30 px-4 py-3 text-[15px] leading-relaxed text-foreground/90"
                >
                  {line}
                </blockquote>
              ))}
            </div>
          )}

          {/* Checklist */}
          {step.checklist && step.checklist.length > 0 && (
            <div className="rounded-lg border bg-card p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Checklist</h3>
              <ul className="space-y-1.5">
                {step.checklist.map((c, i) => {
                  const key = `${stepSlug}:${i}`;
                  return (
                    <li key={key}>
                      <label className="flex items-start gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={!!checks[key]}
                          onCheckedChange={(v) => setChecks((s) => ({ ...s, [key]: v === true }))}
                          className="mt-0.5"
                        />
                        <span className={checks[key] ? "line-through text-muted-foreground" : ""}>{c}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Capture fields */}
          {step.capture && step.capture.length > 0 && (
            <fieldset className="rounded-lg border bg-secondary/30 p-3">
              <legend className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Capture this step
              </legend>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {step.capture.map((key) => (
                  <CaptureInput
                    key={key}
                    fieldKey={key}
                    event={event}
                    contact={contact}
                    onSaveEvent={onSaveEvent}
                    onSaveContact={onSaveContact}
                  />
                ))}
              </div>
            </fieldset>
          )}

          {/* Decisions */}
          {step.decisions && step.decisions.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What happened?</div>
              <div className="grid gap-2">
                {step.decisions.map((d, i) => (
                  <Button
                    key={i}
                    variant={d.variant === "primary" ? "default" : d.variant === "muted" ? "ghost" : "outline"}
                    className="justify-between"
                    onClick={() => goto(d.goto, d.patch)}
                  >
                    <span>{d.label}</span>
                    <ChevronRight className="h-4 w-4 opacity-70" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function CaptureInput({
  fieldKey,
  event,
  contact,
  onSaveEvent,
  onSaveContact,
}: {
  fieldKey: CaptureField;
  event: AnyEvent;
  contact: AnyContact;
  onSaveEvent: (patch: Record<string, unknown>) => Promise<void> | void;
  onSaveContact: (patch: Record<string, unknown>) => Promise<void> | void;
}) {
  const meta = FIELD_META[fieldKey];
  const isContact = meta.on === "contact";
  const dbKey = isContact ? CONTACT_FIELD_KEY[fieldKey]! : fieldKey;
  const source = isContact ? contact : event;
  const raw = source ? source[dbKey] : "";
  const [v, setV] = useState<string>(raw == null ? "" : String(raw));

  useEffect(() => {
    setV(raw == null ? "" : String(raw));
  }, [raw]);

  const save = (val: unknown) => {
    const patch = { [dbKey]: val };
    if (isContact) onSaveContact(patch);
    else onSaveEvent(patch);
  };

  if (meta.type === "boolean") {
    return (
      <label className="flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm cursor-pointer sm:col-span-2">
        <Checkbox checked={!!raw} onCheckedChange={(val) => save(val === true)} />
        {meta.label}
      </label>
    );
  }

  if (meta.type === "textarea") {
    return (
      <div className="grid gap-1 sm:col-span-2">
        <Label className="text-xs">{meta.label}</Label>
        <Textarea
          rows={2}
          value={v}
          onChange={(e) => setV(e.target.value)}
          onBlur={() => v !== String(raw ?? "") && save(v || null)}
        />
      </div>
    );
  }

  return (
    <div className="grid gap-1">
      <Label className="text-xs">{meta.label}</Label>
      <Input
        type={meta.type === "number" ? "number" : meta.type === "date" ? "date" : meta.type === "time" ? "time" : "text"}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => {
          if (v === String(raw ?? "")) return;
          if (meta.type === "number") save(v === "" ? null : Number(v));
          else save(v || null);
        }}
      />
    </div>
  );
}
