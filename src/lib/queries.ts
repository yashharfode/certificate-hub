import { supabase } from "@/integrations/supabase/client";

export async function listHackathons() {
  const { data, error } = await supabase.from("hackathons").select("*").order("created_at", { ascending: false });
  if (error) throw error; return data ?? [];
}
export async function listCategories() {
  const { data, error } = await supabase.from("award_categories").select("*").order("sort_order");
  if (error) throw error; return data ?? [];
}
export async function listCertificates(filters: { hackathon_id?: string; category_id?: string; search?: string; template_id?: string } = {}) {
  let q = supabase.from("certificates").select("*, hackathons(name, edition), award_categories(name)").order("created_at", { ascending: false }).limit(1000);
  if (filters.hackathon_id) q = q.eq("hackathon_id", filters.hackathon_id);
  if (filters.category_id) q = q.eq("category_id", filters.category_id);
  if (filters.template_id) q = q.eq("template_id", filters.template_id);
  if (filters.search) q = q.or(`recipient_name.ilike.%${filters.search}%,certificate_id.ilike.%${filters.search}%,project_name.ilike.%${filters.search}%`);
  const { data, error } = await q;
  if (error) throw error; return data ?? [];
}