import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Pencil, Save, X } from "lucide-react";
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

  useEffect(() => {
    setTitle(section.title);
    setBody(section.body);
  }, [section.title, section.body]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("script_sections")
      .update({ title, body })
      .eq("id", section.id);
    setSaving(false);
    if (error) {
      toast.error("Save failed: " + error.message);
      return;
    }
    toast.success("Script updated");
    onUpdated?.({ ...section, title, body });
    setEditing(false);
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
              className="h-8 text-sm"
              placeholder="Section title"
            />
            <Textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="text-xs font-sans leading-relaxed"
              placeholder="Script body"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={save} disabled={saving}>
                <Save className="mr-1.5 h-3 w-3" />
                {saving ? "Saving…" : "Save"}
              </Button>
              <Button size="sm" variant="ghost" onClick={cancel} disabled={saving}>
                <X className="mr-1.5 h-3 w-3" />
                Cancel
              </Button>
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