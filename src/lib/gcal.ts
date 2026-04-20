/**
 * Build a Google Calendar "create event" URL that opens prefilled in a new tab.
 * No OAuth required — uses the public render?action=TEMPLATE flow.
 *
 * https://calendar.google.com/calendar/render
 *   ?action=TEMPLATE
 *   &text=Title
 *   &details=Body
 *   &dates=YYYYMMDDTHHmmssZ/YYYYMMDDTHHmmssZ
 *   &location=Optional
 */
export type GCalEventInput = {
  title: string;
  details?: string;
  start: Date | string;
  /** Defaults to start + 30 minutes if omitted. */
  end?: Date | string;
  location?: string;
};

function toGCalDate(d: Date) {
  // YYYYMMDDTHHmmssZ in UTC
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getUTCFullYear().toString() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    "T" +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    "Z"
  );
}

export function gcalLink(input: GCalEventInput): string {
  const start = new Date(input.start);
  const end = input.end ? new Date(input.end) : new Date(start.getTime() + 30 * 60 * 1000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates: `${toGCalDate(start)}/${toGCalDate(end)}`,
  });
  if (input.details) params.set("details", input.details);
  if (input.location) params.set("location", input.location);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function openGCal(input: GCalEventInput) {
  window.open(gcalLink(input), "_blank", "noopener,noreferrer");
}
