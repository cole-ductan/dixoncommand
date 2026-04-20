import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { OFFER_PDF_MAP, DRIVE_FOLDER_IDS } from "@/lib/offerPdfMap";
import { OFFER_EXPANDED } from "@/lib/offerExpanded";

type DriveFile = { id: string; name: string; mimeType: string };

async function fetchFolder(folderId: string, apiKey: string): Promise<DriveFile[]> {
  const url = new URL("https://www.googleapis.com/drive/v3/files");
  url.searchParams.set("q", `'${folderId}' in parents and mimeType='application/pdf' and trashed=false`);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("fields", "files(id,name,mimeType)");
  url.searchParams.set("pageSize", "200");
  const res = await fetch(url.toString());
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Drive API ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files ?? [];
}

/**
 * Lists all PDFs across the configured Drive folders.
 */
export const listDrivePdfs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      return { ok: false as const, error: "GOOGLE_DRIVE_API_KEY not configured", files: [] };
    }
    try {
      const all: DriveFile[] = [];
      for (const fid of DRIVE_FOLDER_IDS) {
        const files = await fetchFolder(fid, apiKey);
        all.push(...files);
      }
      return { ok: true as const, files: all };
    } catch (e: any) {
      return { ok: false as const, error: String(e?.message ?? e), files: [] };
    }
  });

/**
 * Seeds offer_pdfs for the current user by mapping Drive PDFs to offer slugs.
 * Idempotent: deletes existing rows for this user first, then inserts fresh.
 * Also backfills offers.expanded_details from OFFER_EXPANDED if missing.
 */
export const seedOfferContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) return { ok: false as const, error: "Drive key missing", inserted: 0 };

    // 1. Backfill expanded_details on offers
    const { data: existingOffers } = await supabase
      .from("offers")
      .select("id, slug, expanded_details");
    if (existingOffers) {
      for (const o of existingOffers) {
        const exp = OFFER_EXPANDED[o.slug];
        if (exp && !o.expanded_details) {
          await supabase.from("offers").update({ expanded_details: exp }).eq("id", o.id);
        }
      }
    }

    // 2. Pull Drive PDFs
    let allFiles: DriveFile[] = [];
    try {
      for (const fid of DRIVE_FOLDER_IDS) {
        allFiles.push(...(await fetchFolder(fid, apiKey)));
      }
    } catch (e: any) {
      return { ok: false as const, error: String(e?.message ?? e), inserted: 0 };
    }

    // 3. Wipe existing for this user
    await supabase.from("offer_pdfs").delete().eq("user_id", userId);

    // 4. Map files → rows
    const rows: Array<{
      user_id: string;
      offer_slug: string;
      name: string;
      drive_file_id: string;
      drive_url: string;
      sort_order: number;
    }> = [];
    for (const [slug, patterns] of Object.entries(OFFER_PDF_MAP)) {
      let order = 0;
      for (const pat of patterns) {
        const matches = allFiles.filter((f) =>
          f.name.toLowerCase().includes(pat.toLowerCase()),
        );
        for (const f of matches) {
          // dedupe by file id within this slug
          if (rows.some((r) => r.offer_slug === slug && r.drive_file_id === f.id)) continue;
          rows.push({
            user_id: userId,
            offer_slug: slug,
            name: f.name.replace(/\.pdf$/i, ""),
            drive_file_id: f.id,
            drive_url: `https://drive.google.com/file/d/${f.id}/view`,
            sort_order: order++,
          });
        }
      }
    }

    if (rows.length > 0) {
      const { error } = await supabase.from("offer_pdfs").insert(rows);
      if (error) return { ok: false as const, error: error.message, inserted: 0 };
    }
    return { ok: true as const, inserted: rows.length };
  });
