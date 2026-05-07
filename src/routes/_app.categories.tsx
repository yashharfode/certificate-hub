import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listCategories } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/categories")({ component: Categories });

function Categories() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const [name, setName] = useState("");

  const add = async () => {
    if (!name.trim()) return;
    const { error } = await supabase.from("award_categories").insert({ name: name.trim(), sort_order: (q.data?.length ?? 0) + 1 });
    if (error) return toast.error(error.message);
    setName(""); qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Added");
  };
  const del = async (id: string) => {
    const { error } = await supabase.from("award_categories").delete().eq("id", id);
    if (error) toast.error(error.message); else { qc.invalidateQueries({ queryKey: ["categories"] }); toast.success("Deleted"); }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6"><div className="text-xs tracking-[0.3em] text-gold">AWARDS</div><h1 className="display text-3xl font-bold mt-1">Categories</h1></div>
      <div className="glass rounded-2xl p-4 flex gap-2 mb-4">
        <Input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
        <Button onClick={add} className="bg-gold text-primary-foreground hover:bg-gold/90"><Plus className="w-4 h-4 mr-2" />Add</Button>
      </div>
      <div className="glass rounded-2xl divide-y divide-border">
        {q.data?.map((c) => (
          <div key={c.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="font-semibold">{c.name}</div>
              {c.description && <div className="text-xs text-muted-foreground">{c.description}</div>}
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(c.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}