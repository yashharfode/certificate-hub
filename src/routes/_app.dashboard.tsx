import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Award, Trophy, Tags, FileStack } from "lucide-react";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({ component: Dashboard });

function Dashboard() {
  const stats = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const [c, h, cat] = await Promise.all([
        supabase.from("certificates").select("*", { count: "exact", head: true }),
        supabase.from("hackathons").select("*", { count: "exact", head: true }),
        supabase.from("award_categories").select("*", { count: "exact", head: true }),
      ]);
      const recent = await supabase.from("certificates").select("*, hackathons(name)").order("created_at", { ascending: false }).limit(8);
      return { certs: c.count ?? 0, hacks: h.count ?? 0, cats: cat.count ?? 0, recent: recent.data ?? [] };
    },
  });

  const cards = [
    { label: "Certificates Issued", value: stats.data?.certs ?? 0, icon: Award, to: "/certificates" },
    { label: "Hackathons", value: stats.data?.hacks ?? 0, icon: Trophy, to: "/hackathons" },
    { label: "Categories", value: stats.data?.cats ?? 0, icon: Tags, to: "/categories" },
    { label: "Bulk Generate", value: "→", icon: FileStack, to: "/bulk" },
  ];

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto">
      <div className="mb-10">
        <div className="text-xs tracking-[0.3em] text-gold">OVERVIEW</div>
        <h1 className="display text-3xl md:text-5xl font-bold mt-2">Welcome back.</h1>
        <p className="text-muted-foreground mt-2">Your premium certificate command center.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <Link key={c.label} to={c.to} className="glass rounded-xl p-5 shadow-elegant hover:border-gold/40 transition">
            <c.icon className="w-5 h-5 text-gold" />
            <div className="display text-3xl md:text-4xl font-bold mt-3">{c.value}</div>
            <div className="text-xs text-muted-foreground tracking-wider mt-1">{c.label}</div>
          </Link>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="display text-xl font-bold mb-4">Recently Issued</h2>
        <div className="glass rounded-xl divide-y divide-border overflow-hidden">
          {(stats.data?.recent ?? []).length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-sm">No certificates yet — head to <Link to="/studio" className="text-gold underline">Studio</Link> to create one.</div>
          )}
          {(stats.data?.recent ?? []).map((r: any) => (
            <div key={r.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{r.recipient_name}</div>
                <div className="text-xs text-muted-foreground">{r.hackathons?.name ?? "—"} • {r.certificate_id}</div>
              </div>
              <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}