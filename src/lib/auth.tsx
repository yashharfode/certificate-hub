import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "owner" | "manager";

interface AuthState {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  isStaff: boolean;
  isOwner: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
}

const Ctx = createContext<AuthState | null>(null);

async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingRoles, setLoadingRoles] = useState(true);

  const loadRoles = async (userId: string | undefined) => {
    if (!userId) return [] as AppRole[];

    for (let attempt = 0; attempt < 3; attempt += 1) {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId);

      if (!error) {
        return (data ?? []).map((r) => r.role as AppRole);
      }

      console.error("Failed to load roles", error);
      await supabase.auth.getUser();
      await wait(250 * (attempt + 1));
    }

    return [] as AppRole[];
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoadingSession(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoadingSession(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncRoles = async () => {
      if (loadingSession) return;
      if (!session?.user?.id) {
        if (!cancelled) {
          setRoles([]);
          setLoadingRoles(false);
        }
        return;
      }

      setLoadingRoles(true);
      const nextRoles = await loadRoles(session.user.id);
      if (!cancelled) {
        setRoles(nextRoles);
        setLoadingRoles(false);
      }
    };

    void syncRoles();
    return () => {
      cancelled = true;
    };
  }, [loadingSession, session?.user?.id]);

  const loading = loadingSession || loadingRoles;

  const refreshRoles = useCallback(async () => {
    setLoadingRoles(true);
    const nextRoles = await loadRoles(session?.user?.id);
    setRoles(nextRoles);
    setLoadingRoles(false);
  }, [session?.user?.id]);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    isStaff: roles.includes("owner") || roles.includes("manager"),
    isOwner: roles.includes("owner"),
    signOut: async () => {
      await supabase.auth.signOut();
    },
    refreshRoles,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}
