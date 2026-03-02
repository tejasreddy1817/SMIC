import { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { jwtDecode } from "jwt-decode";
import { getPermissionsForRole, roleHasPermission } from "@/lib/permissions";

const INTERNAL_DOMAINS = ["thesmic.com", "thesim.com"]; // lowercase — email is .toLowerCase()'d before comparison
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000; // Check every 30 minutes
const TOKEN_REFRESH_THRESHOLD = 2 * 60 * 60 * 1000; // Refresh when < 2 hours remain

function isInternalEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1];
  return INTERNAL_DOMAINS.includes(domain);
}

interface ServerTokenPayload {
  sub: string;
  email?: string;
  role: string;
  orgId?: string;
  suspended?: boolean;
  exp: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: string | null;
  organizationId: string | null;
  permissions: string[];
  hasPermission: (p: string) => boolean;
  serverOnline: boolean;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getBackendUrl(): string {
  return import.meta.env.VITE_BACKEND_URL || "";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [serverOnline, setServerOnline] = useState(true);
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Parse server token to extract role and org info
  const parseServerToken = useCallback(() => {
    const token = localStorage.getItem("server_token");
    if (token) {
      try {
        const payload = jwtDecode<ServerTokenPayload>(token);
        if (payload.exp * 1000 > Date.now()) {
          setRole(payload.role);
          setOrganizationId(payload.orgId || null);
          return payload;
        } else {
          // Token expired — don't remove yet, refresh endpoint accepts recently-expired tokens
          setRole(null);
          setOrganizationId(null);
        }
      } catch {
        localStorage.removeItem("server_token");
        setRole(null);
        setOrganizationId(null);
      }
    } else {
      setRole(null);
      setOrganizationId(null);
    }
    return null;
  }, []);

  // Refresh the server token if it's close to expiry or recently expired
  const refreshServerToken = useCallback(async () => {
    const token = localStorage.getItem("server_token");
    if (!token) return false;

    try {
      const payload = jwtDecode<ServerTokenPayload>(token);
      const timeLeft = payload.exp * 1000 - Date.now();

      // Only refresh if token is expiring soon (< 2 hours) or already expired (within 7 days)
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      if (timeLeft > TOKEN_REFRESH_THRESHOLD) return true; // Still fresh, no need to refresh
      if (timeLeft < -sevenDaysMs) return false; // Too old to refresh

      const base = getBackendUrl();
      const resp = await fetch(`${base}/api/auth/refresh`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.token) {
          localStorage.setItem("server_token", data.token);
          parseServerToken();
          setServerOnline(true);
          return true;
        }
      } else if (resp.status === 401) {
        // Token truly expired and can't be refreshed — clean up
        localStorage.removeItem("server_token");
        setRole(null);
        setOrganizationId(null);
        return false;
      }
    } catch {
      // Network error — server might be offline, but don't invalidate the token
      setServerOnline(false);
    }
    return false;
  }, [parseServerToken]);

  // Check if backend server is reachable
  const checkServerHealth = useCallback(async () => {
    try {
      const base = getBackendUrl();
      const resp = await fetch(`${base}/api/auth/ping`, { method: "GET" });
      setServerOnline(resp.ok);
      return resp.ok;
    } catch {
      setServerOnline(false);
      return false;
    }
  }, []);

  useEffect(() => {
    // Check for server_token first (works for both internal and external users)
    const serverToken = localStorage.getItem("server_token");
    if (serverToken) {
      try {
        const payload = jwtDecode<ServerTokenPayload>(serverToken);
        const timeLeft = payload.exp * 1000 - Date.now();

        if (timeLeft > 0) {
          // Valid server token — restore session immediately
          setUser({ id: payload.sub, email: payload.email || "" } as any);
          setRole(payload.role);
          setOrganizationId(payload.orgId || null);
          setLoading(false);

          // If token is expiring soon, refresh in background
          if (timeLeft < TOKEN_REFRESH_THRESHOLD) {
            refreshServerToken();
          }

          // Start periodic refresh timer
          refreshTimerRef.current = setInterval(() => {
            refreshServerToken();
          }, TOKEN_REFRESH_INTERVAL);

          // For internal users, skip Supabase entirely
          if (payload.email && isInternalEmail(payload.email)) {
            return () => {
              if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
            };
          }
          // For external users with valid server_token, still set up Supabase listener
          // (fall through to Supabase setup below)
        } else {
          // Token expired — try to refresh it
          refreshServerToken().then((refreshed) => {
            if (refreshed) {
              const newToken = localStorage.getItem("server_token");
              if (newToken) {
                const newPayload = jwtDecode<ServerTokenPayload>(newToken);
                setUser({ id: newPayload.sub, email: newPayload.email || "" } as any);
                setRole(newPayload.role);
                setOrganizationId(newPayload.orgId || null);
              }
            }
            // If refresh failed, fall through to Supabase or show login
            setLoading(false);
          });
        }
      } catch {
        localStorage.removeItem("server_token");
      }
    }

    // Set up Supabase auth state listener (external users)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        if (session?.user) {
          setUser(session.user);
        }
        setLoading(false);
      }
    );

    // Check for existing Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setUser(session.user);
      }
      setLoading(false);
    }).catch((err) => {
      console.warn("Supabase getSession failed:", err);
      // Don't clear user if we already have a valid server_token session
      if (!localStorage.getItem("server_token")) {
        setLoading(false);
      }
    });

    // Start periodic refresh timer (if not already started)
    if (!refreshTimerRef.current) {
      refreshTimerRef.current = setInterval(() => {
        refreshServerToken();
      }, TOKEN_REFRESH_INTERVAL);
    }

    return () => {
      subscription.unsubscribe();
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Parse server token whenever user changes
  useEffect(() => {
    parseServerToken();
  }, [user, parseServerToken]);

  const permissions = useMemo(() => getPermissionsForRole(role), [role]);
  const hasPermission = useCallback(
    (p: string) => roleHasPermission(role, p),
    [role]
  );

  const signUp = async (email: string, password: string) => {
    const internal = isInternalEmail(email);

    if (internal) {
      // Internal users: direct backend registration, no Supabase, no password needed
      try {
        const base = getBackendUrl();
        const resp = await fetch(`${base}/api/auth/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          return { error: new Error(data.error || "Registration failed") };
        }
        if (data.token) {
          localStorage.setItem("server_token", data.token);
          setUser({ id: data.id, email } as any);
          parseServerToken();
          setServerOnline(true);
        }
        return { error: null };
      } catch (e: any) {
        setServerOnline(false);
        return { error: new Error("Cannot connect to server. Please ensure the backend is running on " + getBackendUrl()) };
      }
    }

    // External users: Supabase + backend
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });

    if (!error) {
      try {
        const base = getBackendUrl();
        await fetch(`${base}/api/auth/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        setServerOnline(true);
      } catch (e) {
        setServerOnline(false);
        console.warn("Failed to register on backend server:", e);
      }
    }

    return { error: error as Error | null };
  };

  const signIn = async (email: string, password: string) => {
    const internal = isInternalEmail(email);

    if (internal) {
      // Internal users: email-only login directly to backend, skip Supabase
      try {
        const base = getBackendUrl();
        const resp = await fetch(`${base}/api/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await resp.json();
        if (!resp.ok) {
          return { error: new Error(data.error || "Login failed") };
        }
        if (data.token) {
          localStorage.setItem("server_token", data.token);
          setUser({ id: "internal", email } as any);
          parseServerToken();
          setServerOnline(true);
        }
        return { error: null };
      } catch (e: any) {
        setServerOnline(false);
        return { error: new Error("Cannot connect to server. Please ensure the backend is running on " + getBackendUrl()) };
      }
    }

    // External users: Supabase auth first, then backend
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error as Error | null };

    try {
      const base = getBackendUrl();
      let resp = await fetch(`${base}/api/auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // If backend user doesn't exist yet, auto-register then retry login
      if (!resp.ok) {
        await fetch(`${base}/api/auth/register`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
        resp = await fetch(`${base}/api/auth/login`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }

      if (resp.ok) {
        const j = await resp.json();
        if (j.token) {
          localStorage.setItem("server_token", j.token);
          parseServerToken();
          setServerOnline(true);
        }
      }
    } catch (e) {
      setServerOnline(false);
      console.warn("Failed to fetch server token:", e);
    }

    return { error: null };
  };

  const signOut = async () => {
    localStorage.removeItem("server_token");
    setRole(null);
    setOrganizationId(null);
    setUser(null);
    setSession(null);
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    await supabase.auth.signOut().catch(() => {});
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, role, organizationId, permissions, hasPermission, serverOnline, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
