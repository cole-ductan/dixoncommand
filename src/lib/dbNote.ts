import type { Database } from "@/integrations/supabase/types";
import { stageLabel, type Stage } from "./stages";
import { format } from "date-fns";

type EventRow = Database["public"]["Tables"]["events"]["Row"];

/**
 * Generate the single-line "Dixon DB Note Line" for pasting into the
 * Dixon database Notes field — formatted per the user's TEMPLATE — New Call Note page.
 *
 * Format:
 * DATE — CALL TYPE — POC: NAME — STAGE | Par 3 Booked | Par 5 Booked | CGT Created | Addr: ... | Next: ...
 */
export function generateDbNoteLine(opts: {
  event: EventRow;
  callType?: string;
  pocName?: string;
}) {
  const { event, callType = "Call", pocName = "—" } = opts;
  const date = format(new Date(), "yyyy-MM-dd");
  const parts: string[] = [
    date,
    callType,
    `POC: ${pocName}`,
    stageLabel(event.stage as Stage),
  ];
  const flags: string[] = [];
  if (event.par3_booked) flags.push("Par 3 Booked");
  if (event.par5_booked) flags.push("Par 5 Booked");
  if (event.cgt_created) flags.push(`CGT Created${event.cgt_url ? ` (${event.cgt_url})` : ""}`);
  if (event.custom_products_sold) flags.push("Custom Products Sold");
  if (event.auction_referred) flags.push("Auction Referred");
  if (event.amateur_endorsement_sent) flags.push("AE Sent");
  if (event.check_address) flags.push(`Addr: ${event.check_address}`);
  if (event.where_left_off) flags.push(`Next: ${event.where_left_off}`);

  return [parts.join(" — "), ...flags].join(" | ");
}
