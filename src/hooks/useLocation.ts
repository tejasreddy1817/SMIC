import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface GeoLocation {
  country: string;
  countryCode: string;
  state?: string;
  city?: string;
  region?: string;
  coordinates?: { lat: number; lng: number };
  languages?: string[];
  timezone?: string;
}

export interface LocationContext {
  location: GeoLocation;
  culturalPreferences?: string[];
  contentLanguages?: string[];
  localPlatforms?: string[];
}

export interface LocationRegion {
  code: string;
  name: string;
  platforms: string[];
}

export function useLocation() {
  const [location, setLocation] = useState<string>("");
  const [context, setContext] = useState<LocationContext | null>(null);
  const [regions, setRegions] = useState<LocationRegion[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRegions = useCallback(async () => {
    try {
      const resp = await api.get("/api/location/regions");
      if (resp.ok) {
        const data = await resp.json();
        setRegions(data.regions || []);
      }
    } catch {
      // Ignore
    }
  }, []);

  const resolveLocation = useCallback(async (loc: string) => {
    setLoading(true);
    setLocation(loc);
    try {
      const resp = await api.post("/api/location/resolve", { location: loc });
      if (resp.ok) {
        const data = await resp.json();
        setContext(data.context || null);
        return data;
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  const enrichLocation = useCallback(async (loc: string, opts?: { niches?: string[]; platforms?: string[]; languages?: string[] }) => {
    setLoading(true);
    setLocation(loc);
    try {
      const resp = await api.post("/api/location/enrich", { location: loc, ...opts });
      if (resp.ok) {
        const data = await resp.json();
        setContext(data.context?.location || null);
        return data;
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  return {
    location,
    setLocation,
    context,
    regions,
    loading,
    fetchRegions,
    resolveLocation,
    enrichLocation,
  };
}
