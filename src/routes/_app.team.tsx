import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/_app/team")({ component: Team });

function Team() {
  const { isOwner, user } = useAuth();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ["team"],
    queryFn: async () => {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*"),
        supabase.from("user_roles").select("*"),
      ]);
      return (profiles ?? []).map((p) => ({ ...p, roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role) }));
    },
  });

  if (!isOwner) return <div className="p-8">Owner access only.</div>;

  const setRole = async (userId: string, role: "manager", action: "add" | "remove") => {
    if (action === "add") {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", role);
      if (error) return toast.error(error.message);
    }
    toast.success("Updated"); qc.invalidateQueries({ queryKey: ["team"] });
  };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6"><div className="text-xs tracking-[0.3em] text-gold">ACCESS</div><h1 className="display text-3xl font-bold mt-1">Team</h1>
        <p className="text-muted-foreground text-sm mt-2">Anyone who signs up first becomes owner. Other accounts wait for you to grant Manager access. Send your manager the sign-in link, then promote them here.</p>
      </div>
      <div className="glass rounded-2xl divide-y divide-border">
        {q.data?.map((m: any) => {
          const isMgr = m.roles.includes("manager");
          const isOw = m.roles.includes("owner");
          return (
            <div key={m.id} className="p-4 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{m.full_name || m.email}</div>
                <div className="text-xs text-muted-foreground">{m.email} • {isOw ? <span className="text-gold">OWNER</span> : isMgr ? "Manager" : "No access"}</div>
              </div>
              {!isOw && (
                isMgr
                  ? <Button size="sm" variant="outline" onClick={() => setRole(m.id, "manager", "remove")}>Revoke</Button>
                  : <Button size="sm" className="bg-gold text-primary-foreground hover:bg-gold/90" onClick={() => setRole(m.id, "manager", "add")}>Make Manager</Button>
              )}
              {m.id === user?.id && <span className="text-xs text-muted-foreground">(you)</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}