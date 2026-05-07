import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Award, ShieldCheck, Sparkles, Layers, Filter, Database } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard" });
  }, [loading, session, navigate]);

  return (
    <div className="min-h-screen">
      <header className="container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold flex items-center justify-center text-primary-foreground font-bold">D</div>
          <div>
            <div className="display text-lg font-bold tracking-widest">DEVLYNIX</div>
            <div className="text-[10px] text-muted-foreground tracking-[0.3em]">CERTIFICATE STUDIO</div>
          </div>
        </div>
        <Link to="/auth"><Button variant="outline" className="border-gold/40">Sign in</Button></Link>
      </header>

      <section className="container mx-auto px-6 pt-16 pb-24 text-center max-w-4xl">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs tracking-[0.25em] text-gold mb-8">
          <Sparkles className="w-3 h-3" /> PREMIUM CERTIFICATE PLATFORM
        </div>
        <h1 className="display text-5xl md:text-7xl font-bold leading-tight">
          <span className="gradient-gold-text">Craft Certificates</span><br/>worthy of the moment.
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl mt-8 max-w-2xl mx-auto">
          Design, generate, manage and track every hackathon certificate — with five premium templates, bulk CSV/Excel imports and a secure cloud archive built to scale to 50,000+ certificates.
        </p>
        <div className="flex justify-center gap-3 mt-10">
          <Link to="/auth"><Button size="lg" className="bg-gold text-primary-foreground hover:bg-gold/90 shadow-gold">Enter Studio</Button></Link>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24 grid md:grid-cols-3 gap-6">
        {[
          { icon: Layers, title: "5 Premium Templates", desc: "Royal, Modern, Bold, Elegant, Corporate." },
          { icon: Filter, title: "Smart Filters", desc: "Filter by hackathon, category, recipient, date." },
          { icon: Database, title: "Cloud Archive", desc: "Scales to 50k+ certificates — portable schema." },
          { icon: ShieldCheck, title: "Owner & Manager Roles", desc: "Locked to you. Invite managers anytime." },
          { icon: Award, title: "Bulk Generate", desc: "Manual rows + CSV/Excel imports → ZIP of PNGs." },
          { icon: Sparkles, title: "Future Verify-Ready", desc: "Each cert stores design snapshot for portability." },
        ].map((f) => (
          <div key={f.title} className="glass rounded-2xl p-6 shadow-elegant">
            <f.icon className="w-6 h-6 text-gold" />
            <h3 className="display text-xl font-semibold mt-4">{f.title}</h3>
            <p className="text-muted-foreground text-sm mt-2">{f.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
