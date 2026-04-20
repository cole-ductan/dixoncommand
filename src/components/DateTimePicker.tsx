import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface Props {
  /** ISO string ("2026-04-20T15:30") or empty */
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Combined date (calendar popover) + time (text input) picker.
 * Emits "YYYY-MM-DDTHH:mm" — same shape as <input type="datetime-local">.
 */
export function DateTimePicker({ value, onChange, placeholder = "Pick a date", className }: Props) {
  const date = value ? new Date(value) : undefined;
  const time = value ? value.slice(11, 16) : "09:00";

  const setDate = (d: Date | undefined) => {
    if (!d) {
      onChange("");
      return;
    }
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}T${time}`);
  };

  const setTime = (t: string) => {
    const base = date ?? new Date();
    const yyyy = base.getFullYear();
    const mm = String(base.getMonth() + 1).padStart(2, "0");
    const dd = String(base.getDate()).padStart(2, "0");
    onChange(`${yyyy}-${mm}-${dd}T${t}`);
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn("flex-1 justify-start text-left font-normal", !date && "text-muted-foreground")}
            type="button"
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date ? format(date, "EEE, MMM d, yyyy") : <span>{placeholder}</span>}
            {date && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onChange("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.stopPropagation();
                    e.preventDefault();
                    onChange("");
                  }
                }}
                className="ml-auto rounded p-0.5 hover:bg-secondary inline-flex items-center"
                aria-label="Clear date"
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
          <Calendar
            mode="single"
            selected={date}
            onSelect={setDate}
            initialFocus
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
      <Input
        type="time"
        value={time}
        onChange={(e) => setTime(e.target.value)}
        className="w-[110px]"
      />
    </div>
  );
}
