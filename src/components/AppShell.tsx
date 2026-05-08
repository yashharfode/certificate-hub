import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { useEffect, useState } from "react";
import { Award, LayoutDashboard, Trophy, Tags, Users, Sparkles, LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, owner: false },
  { to: "/studio", label: "Studio", icon: Sparkles, owner: false },
  { to: "/certificates", label: "All Certificates", icon: Award, owner: false },
  { to: "/hackathons", label: "Hackathons", icon: Trophy, owner: false },
  { to: "/categories", label: "Categories", icon: Tags, owner: false },
  { to: "/team", label: "Team", icon: Users, owner: true },
] as const;

export function AppShell() {
  const { session, loading, isStaff, isOwner, signOut, user } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth" });
  }, [loading, session, navigate]);

  useEffect(() => { setOpen(false); }, [loc.pathname]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!session) return null;

  if (!isStaff) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6 text-center">
        <div className="glass rounded-2xl p-8 max-w-md">
          <h2 className="display text-2xl font-bold gradient-gold-text">Access Pending</h2>
          <p className="text-muted-foreground mt-3">Your account is signed in but doesn't have access yet. Ask the owner to grant you Manager access.</p>
          <Button onClick={signOut} variant="outline" className="mt-6">Sign out</Button>
        </div>
      </div>
    );
  }

  const items = NAV.filter((n) => !n.owner || isOwner);

  return (
    <div className="min-h-screen flex">
      {/* Mobile topbar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 glass flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gold text-primary-foreground flex items-center justify-center font-bold">D</div>
          <div className="display text-sm tracking-widest">DEVLYNIX</div>
        </div>
        <button onClick={() => setOpen((v) => !v)} className="p-2">
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      <aside className={cn(
        "fixed md:sticky top-0 left-0 z-30 w-72 h-screen bg-sidebar border-r border-sidebar-border flex flex-col transition-transform",
        "md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="px-6 py-6 border-b border-sidebar-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gold text-primary-foreground flex items-center justify-center font-bold">D</div>
            <div>
              <div className="display text-base font-bold tracking-widest">DEVLYNIX</div>
              <div className="text-[10px] text-muted-foreground tracking-[0.3em]">CERTIFICATE STUDIO</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((n) => {
            const active = loc.pathname.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to} className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                active ? "bg-gold/15 text-gold" : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              )}>
                <n.icon className="w-4 h-4" />{n.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-sidebar-border">
          <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
          <div className="text-[10px] tracking-widest text-gold mt-0.5">{isOwner ? "OWNER" : "MANAGER"}</div>
          <Button onClick={signOut} variant="outline" size="sm" className="w-full mt-3"><LogOut className="w-3 h-3 mr-2" />Sign out</Button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 pt-16 md:pt-0">
        <Outlet />
      </main>
    </div>
  );
}