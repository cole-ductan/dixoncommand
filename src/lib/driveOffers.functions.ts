import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { OFFER_PDF_MAP, DRIVE_FOLDER_IDS } from "@/lib/offerPdfMap";
import { OFFER_EXPANDED } from "@/lib/offerExpanded";

type DriveFile = { id: string; name: string; mimeType: string };

const BUCKET = "offer-pdfs";

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

async function downloadDrivePdf(fileId: string, apiKey: string): Promise<ArrayBuffer> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${apiKey}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Drive download ${res.status} for ${fileId}`);
  }
  return await res.arrayBuffer();
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

/**
 * Mirrors all PDFs from Drive into Lovable Cloud Storage (one-time).
 * After this runs successfully the app no longer depends on Drive.
 * Idempotent: re-uploading the same file overwrites it; rebuilds offer_pdfs rows.
 */
export const mirrorOfferPdfsToStorage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    try {
      const { supabase, userId } = context;
      const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
      if (!apiKey) {
        return { ok: false as const, error: "GOOGLE_DRIVE_API_KEY not configured", inserted: 0, uploaded: 0 };
      }

      // 1. Backfill expanded_details on offers
      const { data: existingOffers, error: offersErr } = await supabase
        .from("offers")
        .select("id, slug, expanded_details");
      if (offersErr) {
        return { ok: false as const, error: `offers select: ${offersErr.message}`, inserted: 0, uploaded: 0 };
      }
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
        return { ok: false as const, error: `drive list: ${String(e?.message ?? e)}`, inserted: 0, uploaded: 0 };
      }

      // 3. Wipe existing rows for this user
      const { error: delErr } = await supabase.from("offer_pdfs").delete().eq("user_id", userId);
      if (delErr) {
        return { ok: false as const, error: `wipe rows: ${delErr.message}`, inserted: 0, uploaded: 0 };
      }

      // 4. For each mapped file: download from Drive, upload to Storage, insert row
      type Row = {
        user_id: string;
        offer_slug: string;
        name: string;
        drive_file_id: string;
        drive_url: string;
        storage_path: string;
        public_url: string;
        sort_order: number;
      };
      const rows: Row[] = [];
      let uploaded = 0;
      const failures: string[] = [];
      const seenForSlug = new Set<string>();

      for (const [slug, patterns] of Object.entries(OFFER_PDF_MAP)) {
        let order = 0;
        for (const pat of patterns) {
          const matches = allFiles.filter((f) =>
            f.name.toLowerCase().includes(pat.toLowerCase()),
          );
          for (const f of matches) {
            const dedupe = `${slug}::${f.id}`;
            if (seenForSlug.has(dedupe)) continue;
            seenForSlug.add(dedupe);

            const storagePath = `${userId}/${slug}/${safeName(f.name)}`;

            try {
              const buf = await downloadDrivePdf(f.id, apiKey);
              const { error: upErr } = await supabaseAdmin.storage
                .from(BUCKET)
                .upload(storagePath, new Uint8Array(buf), {
                  contentType: "application/pdf",
                  upsert: true,
                });
              if (upErr) throw upErr;
              uploaded++;
            } catch (e: any) {
              const msg = e?.message ?? String(e);
              console.error("Upload failed for", f.name, msg);
              failures.push(`${f.name}: ${msg}`);
              continue;
            }

            const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(storagePath);

            rows.push({
              user_id: userId,
              offer_slug: slug,
              name: f.name.replace(/\.pdf$/i, ""),
              drive_file_id: f.id,
              drive_url: `https://drive.google.com/file/d/${f.id}/view`,
              storage_path: storagePath,
              public_url: urlData.publicUrl,
              sort_order: order++,
            });
          }
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase.from("offer_pdfs").insert(rows);
        if (error) return { ok: false as const, error: `insert rows: ${error.message}`, inserted: 0, uploaded, failures };
      }
      return {
        ok: true as const,
        inserted: rows.length,
        uploaded,
        totalDriveFiles: allFiles.length,
        failures: failures.length ? failures.slice(0, 5) : undefined,
      };
    } catch (e: any) {
      return {
        ok: false as const,
        error: `unhandled: ${e?.message ?? String(e)}`,
        inserted: 0,
        uploaded: 0,
      };
    }
  });

// Backwards-compat alias kept for existing callers
export const seedOfferContent = mirrorOfferPdfsToStorage;
