import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

export interface Creator {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  niches: string[];
  languages: string[];
  platform_focus: ("instagram" | "youtube_shorts" | "tiktok")[];
  onboarded_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreatorContextType {
  creator: Creator | null;
  loading: boolean;
  isOnboarded: boolean;
  updateCreator: (updates: Partial<Creator>) => Promise<{ error: Error | null }>;
  completeOnboarding: () => Promise<{ error: Error | null }>;
  refetch: () => Promise<void>;
}

const CreatorContext = createContext<CreatorContextType | undefined>(undefined);

const INTERNAL_ROLES = ["staff", "developer", "founder"];

export function CreatorProvider({ children }: { children: ReactNode }) {
  const { user, role } = useAuth();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  const isInternalUser = !!role && INTERNAL_ROLES.includes(role);

  const fetchCreator = async () => {
    if (!user) {
      setCreator(null);
      setLoading(false);
      return;
    }

    // Internal users (staff/developer/founder) bypass Supabase entirely —
    // they don't have a Supabase session or creators row, so create a synthetic profile.
    if (isInternalUser) {
      const now = new Date().toISOString();
      setCreator({
        id: user.id,
        user_id: user.id,
        email: user.email || "",
        display_name: role,
        niches: [],
        languages: [],
        platform_focus: [],
        onboarded_at: now,
        created_at: now,
        updated_at: now,
      });
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("creators")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching creator:", error);
      }

      setCreator(data as Creator | null);
    } catch (err) {
      console.error("Error in fetchCreator:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCreator();
  }, [user, role]);

  const updateCreator = async (updates: Partial<Creator>) => {
    if (!creator) return { error: new Error("No creator profile found") };

    try {
      const { error } = await supabase
        .from("creators")
        .update(updates)
        .eq("id", creator.id);

      if (error) throw error;

      setCreator({ ...creator, ...updates });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const completeOnboarding = async () => {
    if (!creator) return { error: new Error("No creator profile found") };

    try {
      const { error } = await supabase
        .from("creators")
        .update({ onboarded_at: new Date().toISOString() })
        .eq("id", creator.id);

      if (error) throw error;

      setCreator({ ...creator, onboarded_at: new Date().toISOString() });
      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const isOnboarded = !!creator?.onboarded_at;

  return (
    <CreatorContext.Provider 
      value={{ 
        creator, 
        loading, 
        isOnboarded, 
        updateCreator, 
        completeOnboarding,
        refetch: fetchCreator 
      }}
    >
      {children}
    </CreatorContext.Provider>
  );
}

export function useCreator() {
  const context = useContext(CreatorContext);
  if (context === undefined) {
    throw new Error("useCreator must be used within a CreatorProvider");
  }
  return context;
}
