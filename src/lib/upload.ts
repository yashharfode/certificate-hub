import { supabase } from "@/integrations/supabase/client";

export async function uploadAsset(file: File, folder = "misc"): Promise<string> {
  const ext = file.name.split(".").pop() || "png";
  const path = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("cert-assets").upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("cert-assets").getPublicUrl(path);
  return data.publicUrl;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}