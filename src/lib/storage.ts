import { supabase } from "@/integrations/supabase/client";

const BUCKET = "listing-images";
// 1 year expiry on signed URLs; bucket is private (workspace policy blocks public)
const SIGNED_TTL = 60 * 60 * 24 * 365;

export async function uploadListingImage(userId: string, file: File): Promise<{ path: string; url: string }> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "31536000",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_TTL);
  if (signErr || !data) throw signErr ?? new Error("Failed to sign URL");
  return { path, url: data.signedUrl };
}
