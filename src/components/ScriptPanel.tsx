import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Save, X, Check } from "lucide-react";
import { toast } from "sonner";

export type ScriptSection = {
  id: string;
  slug: string;
  title: string;
  body: string;
  sort_order: number;
};

interface Props {
  sections: ScriptSection[];
  onUpdated?: (updated: ScriptSection) => void;
}

export function ScriptPanel({ sections, onUpdated }: Props) {
  return (
    <Accordion type="multiple" defaultValue={[sections[0]?.slug]} className="w-full">
      {sections.map((s) => (
        <ScriptItem key={s.id} section={s} onUpdated={onUpdated} />
      ))}
    </Accordion>
  );
}

function ScriptItem({ section, onUpdated }: { section: ScriptSection; onUpdated?: (u: ScriptSection) => void }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(section.title);
  const [body, setBody] = useState(section.body);
  const [saving, setSaving] = useState(false);
  const [savedTick, setSavedTick] = useState(false);

  useEffect(() => {
    setTitle(section.title);
    setBody(section.body);
  }, [section.title, section.body]);

  const persist = async (nextTitle: string, nextBody: string) => {
    if (nextTitle === section.title && nextBody === section.body) return true;
    setSaving(true);
    const { error } = await supabase
      .from("script_sections")
      .update({ title: nextTitle, body: nextBody })
      .eq("id", section.id);
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return false;
    }
    onUpdated?.({ ...section, title: nextTitle, body: nextBody });
    setSavedTick(true);
    setTimeout(() => setSavedTick(false), 1200);
    return true;
  };

  const save = async () => {
    const ok = await persist(title, body);
    if (!ok) return;
    toast.success("Script updated");
    setEditing(false);
  };

  // Autosave on blur — guarantees changes persist even if user navigates away
  // before clicking Save.
  const autoSaveOnBlur = () => {
    if (!editing) return;
    if (title === section.title && body === section.body) return;
    void persist(title, body);
  };

  const cancel = () => {
    setTitle(section.title);
    setBody(section.body);
    setEditing(false);
  };

  return (
    <AccordionItem value={section.slug}>
      <div className="flex items-center gap-1">
        <AccordionTrigger className="text-left text-sm flex-1">{section.title}</AccordionTrigger>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setEditing(true);
          }}
          className="p-1.5 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition"
          title="Edit script"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <AccordionContent>
        {editing ? (
          <div className="space-y-2">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={autoSaveOnBlur}
              className="h-8 text-sm"
              placeholder="Section title"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onBlur={autoSaveOnBlur}
              rows={10}
              className="text-xs font-sans leading-relaxed"
              placeholder="Script body"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="mr-1.5 h-3 w-3" />
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
                <X className="mr-1.5 h-3 w-3" />
                Cancel
              </Button>
              {savedTick && (
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                  <Check className="h-3 w-3 text-emerald-500" /> Autosaved
                </span>
              )}
            </div>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-foreground/85">
            {section.body}
          </pre>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}