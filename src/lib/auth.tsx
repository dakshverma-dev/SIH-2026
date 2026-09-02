import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { can as canFor, type Role } from "@/lib/domain/permissions";

interface AuthState {
  user: User | null;
  session: Session | null;
  role: Role | null;
  name: string;
  loading: boolean;
  can: (permission: string) => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  role: null,
  name: "",
  loading: true,
  can: () => false,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadRole = async (userId: string) => {
      const [{ data: roleRow }, { data: profile }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId).maybeSingle(),
        supabase.from("profiles").select("name").eq("id", userId).maybeSingle(),
      ]);
      if (!active) return;
      setRole((roleRow?.role as Role) ?? null);
      setName(profile?.name ?? "");
      setLoading(false);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, next) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED" && event !== "INITIAL_SESSION") {
        return;
      }
      setSession(next);
      if (next?.user) {
        setTimeout(() => void loadRole(next.user.id), 0);
      } else {
        setRole(null);
        setName("");
        setLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      if (data.session?.user) void loadRole(data.session.user.id);
      else setLoading(false);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user: session?.user ?? null,
      session,
      role,
      name,
      loading,
      can: (permission: string) => canFor(role, permission),
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, role, name, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
