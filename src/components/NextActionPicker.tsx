import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X } from "lucide-react";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

const FREE_VALUE = "__free__";

export function NextActionPicker({ value, onChange, placeholder = "Choose next action…" }: Props) {
  const { user } = useAuth();
  const [presets, setPresets] = useState<{ id: string; label: string }[]>([]);
  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("next_action_presets")
      .select("id,label")
      .order("sort_order")
      .then(({ data }) => setPresets(data ?? []));
  }, [user]);

  // If the current value isn't a preset, treat as free-text mode
  useEffect(() => {
    if (value && presets.length > 0 && !presets.some((p) => p.label === value)) {
      setFreeMode(true);
    }
  }, [presets, value]);

  if (freeMode) {
    return (
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Type next action…"
          autoFocus
        />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setFreeMode(false);
            onChange("");
          }}
          title="Back to presets"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Select
      value={value || ""}
      onValueChange={(v) => {
        if (v === FREE_VALUE) {
          setFreeMode(true);
          onChange("");
        } else {
          onChange(v);
        }
      }}
    >
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {presets.map((p) => (
          <SelectItem key={p.id} value={p.label}>
            {p.label}
          </SelectItem>
        ))}
        <div className="my-1 border-t" />
        <SelectItem value={FREE_VALUE} className="text-primary">
          <span className="flex items-center gap-1.5">
            <Pencil className="h-3 w-3" /> Custom action…
          </span>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
