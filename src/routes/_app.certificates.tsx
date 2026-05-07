import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCategories, listCertificates, listHackathons } from "@/lib/queries";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TEMPLATES } from "@/lib/cert-utils";
import { Search, Trash2, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/certificates")({ component: Certificates });

function Certificates() {
  const qc = useQueryClient();
  const hackathons = useQuery({ queryKey: ["hackathons"], queryFn: listHackathons });
  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const [search, setSearch] = useState("");
  const [hackathonId, setHackathonId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [templateId, setTemplateId] = useState<string>("");

  const certs = useQuery({
    queryKey: ["certificates", { search, hackathonId, categoryId, templateId }],
    queryFn: () => listCertificates({ search, hackathon_id: hackathonId || undefined, category_id: categoryId || undefined, template_id: templateId || undefined }),
  });

  const remove = async (id: string) => {
    if (!confirm("Delete this certificate? Cannot be undone.")) return;
    const { error } = await supabase.from("certificates").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["certificates"] }); }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-end justify-between gap-3 mb-6">
        <div>
          <div className="text-xs tracking-[0.3em] text-gold">ARCHIVE</div>
          <h1 className="display text-3xl font-bold mt-1">Certificates</h1>
        </div>
        <Link to="/studio"><Button className="bg-gold text-primary-foreground hover:bg-gold/90">+ New Certificate</Button></Link>
      </div>

      <div className="glass rounded-2xl p-4 grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search name, project, ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <FilterSelect label="All hackathons" value={hackathonId} onChange={setHackathonId} options={hackathons.data?.map((h) => ({ value: h.id, label: h.name })) ?? []} />
        <FilterSelect label="All categories" value={categoryId} onChange={setCategoryId} options={categories.data?.map((c) => ({ value: c.id, label: c.name })) ?? []} />
        <FilterSelect label="All templates" value={templateId} onChange={setTemplateId} options={TEMPLATES.map((t) => ({ value: t.id, label: t.name }))} />
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-secondary/40 text-xs tracking-widest text-muted-foreground">
              <tr>
                <th className="text-left p-3">RECIPIENT</th>
                <th className="text-left p-3">HACKATHON</th>
                <th className="text-left p-3">CATEGORY</th>
                <th className="text-left p-3">CERT ID</th>
                <th className="text-left p-3">DATE</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {certs.data?.map((c: any) => (
                <tr key={c.id} className="border-t border-border hover:bg-secondary/30">
                  <td className="p-3"><div className="font-semibold">{c.recipient_name}</div><div className="text-xs text-muted-foreground">{c.project_name}</div></td>
                  <td className="p-3 text-muted-foreground">{c.hackathons?.name ?? "—"}</td>
                  <td className="p-3 text-muted-foreground">{c.award_categories?.name ?? "—"}</td>
                  <td className="p-3 font-mono text-xs text-gold">{c.certificate_id}</td>
                  <td className="p-3 text-muted-foreground">{new Date(c.issue_date).toLocaleDateString()}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Link to="/certificates/$id" params={{ id: c.id }}><Button size="icon" variant="ghost"><Eye className="w-4 h-4" /></Button></Link>
                    <Button size="icon" variant="ghost" onClick={() => remove(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
                  </td>
                </tr>
              ))}
              {certs.data && certs.data.length === 0 && (
                <tr><td colSpan={6} className="text-center p-8 text-muted-foreground">No certificates match your filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <Select value={value || "__all__"} onValueChange={(v) => onChange(v === "__all__" ? "" : v)}>
      <SelectTrigger><SelectValue placeholder={label} /></SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{label}</SelectItem>
        {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}