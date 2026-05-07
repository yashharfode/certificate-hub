import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listHackathons } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/hackathons")({ component: Hackathons });

function Hackathons() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["hackathons"], queryFn: listHackathons });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: "", edition: "", organizer: "", start_date: "", end_date: "" });

  const save = async () => {
    if (!f.name) return toast.error("Name required");
    const payload: any = { ...f, start_date: f.start_date || null, end_date: f.end_date || null };
    const { error } = await supabase.from("hackathons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success("Hackathon added"); setOpen(false); setF({ name: "", edition: "", organizer: "", start_date: "", end_date: "" });
    qc.invalidateQueries({ queryKey: ["hackathons"] });
  };
  const del = async (id: string) => {
    if (!confirm("Delete this hackathon?")) return;
    const { error } = await supabase.from("hackathons").delete().eq("id", id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["hackathons"] }); }
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-end justify-between mb-6">
        <div><div className="text-xs tracking-[0.3em] text-gold">EVENTS</div><h1 className="display text-3xl font-bold mt-1">Hackathons</h1></div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="bg-gold text-primary-foreground hover:bg-gold/90"><Plus className="w-4 h-4 mr-2" />Add</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Hackathon</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Name *</Label><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></div>
              <div><Label>Edition</Label><Input placeholder="e.g. 1.0" value={f.edition} onChange={(e) => setF({ ...f, edition: e.target.value })} /></div>
              <div><Label>Organizer</Label><Input value={f.organizer} onChange={(e) => setF({ ...f, organizer: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Start</Label><Input type="date" value={f.start_date} onChange={(e) => setF({ ...f, start_date: e.target.value })} /></div>
                <div><Label>End</Label><Input type="date" value={f.end_date} onChange={(e) => setF({ ...f, end_date: e.target.value })} /></div>
              </div>
              <Button onClick={save} className="w-full bg-gold text-primary-foreground hover:bg-gold/90">Save</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <div className="glass rounded-2xl divide-y divide-border">
        {q.data?.length === 0 && <div className="p-6 text-center text-muted-foreground">No hackathons yet.</div>}
        {q.data?.map((h) => (
          <div key={h.id} className="p-4 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold">{h.name} {h.edition && <span className="text-gold">— {h.edition}</span>}</div>
              <div className="text-xs text-muted-foreground">{h.organizer || "—"} • {h.start_date || "?"} → {h.end_date || "?"}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={() => del(h.id)}><Trash2 className="w-4 h-4 text-destructive" /></Button>
          </div>
        ))}
      </div>
    </div>
  );
}