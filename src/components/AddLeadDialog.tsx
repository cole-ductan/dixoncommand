import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { toast } from "sonner";

export function AddLeadDialog({
  trigger,
  onCreated,
  open: openProp,
  onOpenChange,
  defaultDate,
}: {
  trigger?: React.ReactNode;
  onCreated?: (eventId: string) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultDate?: string;
}) {
  const { user } = useAuth();
  const [openInternal, setOpenInternal] = useState(false);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp! : openInternal;
  const setOpen = (v: boolean) => {
    if (!isControlled) setOpenInternal(v);
    onOpenChange?.(v);
  };
  const [saving, setSaving] = useState(false);
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [eventName, setEventName] = useState("");
  const [course, setCourse] = useState("");
  const [eventDate, setEventDate] = useState(defaultDate ?? "");
  const [notes, setNotes] = useState("");

  // Sync defaultDate when dialog opens
  useEffect(() => {
    if (open && defaultDate) setEventDate(defaultDate);
  }, [open, defaultDate]);

  const reset = () => {
    setOrgName(""); setContactName(""); setContactEmail(""); setContactPhone("");
    setEventName(""); setCourse(""); setEventDate(""); setNotes("");
  };

  const submit = async () => {
    if (!user) return;
    if (!eventName.trim() || !orgName.trim()) {
      toast.error("Organization and Event name are required");
      return;
    }
    setSaving(true);
    try {
      const { data: org, error: oErr } = await supabase
        .from("organizations")
        .insert({ user_id: user.id, name: orgName.trim() })
        .select().single();
      if (oErr) throw oErr;

      let contactId: string | null = null;
      if (contactName.trim()) {
        const { data: c, error: cErr } = await supabase
          .from("contacts")
          .insert({
            user_id: user.id,
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
          user_id: user.id,
          organization_id: org.id,
          primary_contact_id: contactId,
          event_name: eventName.trim(),
          course: course.trim() || null,
          event_date: eventDate || null,
          notes: notes.trim() || null,
          stage: "new_lead",
        })
        .select().single();
      if (eErr) throw eErr;

      toast.success("Lead added");
      reset();
      setOpen(false);
      onCreated?.(ev.id);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to add lead");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger !== null && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm"><Plus className="mr-1.5 h-4 w-4" />Add Lead</Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add Lead</DialogTitle>
          <DialogDescription>
            Create an organization, primary contact, and tournament event in one step.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="org">Organization *</Label>
            <Input id="org" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="St. Vincent's Charity Foundation" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="contact">Contact name</Label>
              <Input id="contact" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Sarah Mitchell" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="(555) 010-1000" />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@org.com" />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="event">Event name *</Label>
            <Input id="event" value={eventName} onChange={(e) => setEventName(e.target.value)} placeholder="Annual Scholarship Classic" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="course">Golf course</Label>
              <Input id="course" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="Pebble Creek GC" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="date">Event date</Label>
              <Input id="date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything you want to remember…" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Add Lead"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
