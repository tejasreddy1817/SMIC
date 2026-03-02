import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Globe, Loader2, Check } from "lucide-react";
import { useLocation, LocationContext } from "@/hooks/useLocation";
import { api } from "@/lib/api";

const QUICK_LOCATIONS = [
  { label: "India", value: "India", code: "IN" },
  { label: "United States", value: "United States", code: "US" },
  { label: "United Kingdom", value: "United Kingdom", code: "GB" },
  { label: "Brazil", value: "Brazil", code: "BR" },
  { label: "Japan", value: "Japan", code: "JP" },
  { label: "Nigeria", value: "Nigeria", code: "NG" },
  { label: "Germany", value: "Germany", code: "DE" },
  { label: "Indonesia", value: "Indonesia", code: "ID" },
];

interface GeoCountry { code: string; name: string; languages: string[] }
interface GeoState { code: string; name: string; languages?: string[] }
interface GeoCity { name: string; languages?: string[] }

interface LocationPickerProps {
  onLocationChange: (location: string, context: LocationContext | null) => void;
  compact?: boolean;
  mode?: "simple" | "cascading";
  onGeoChange?: (geo: { country: string; state?: string; city?: string; countryName?: string; stateName?: string }) => void;
}

export function LocationPicker({ onLocationChange, compact, mode = "simple", onGeoChange }: LocationPickerProps) {
  const { location, context, loading, resolveLocation } = useLocation();
  const [customLocation, setCustomLocation] = useState("");
  const [selected, setSelected] = useState<string>("");

  // Cascading state
  const [countries, setCountries] = useState<GeoCountry[]>([]);
  const [states, setStates] = useState<GeoState[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [cascadeLoading, setCascadeLoading] = useState(false);

  // Load countries on mount (cascading mode)
  useEffect(() => {
    if (mode !== "cascading") return;
    (async () => {
      try {
        const resp = await api.get("/api/location/countries");
        if (resp.ok) {
          const data = await resp.json();
          setCountries(data.countries || []);
        }
      } catch { /* ignore */ }
    })();
  }, [mode]);

  // Load states when country changes
  useEffect(() => {
    if (mode !== "cascading" || !selectedCountry) return;
    setStates([]);
    setCities([]);
    setSelectedState("");
    setSelectedCity("");
    (async () => {
      try {
        const resp = await api.get(`/api/location/states/${selectedCountry}`);
        if (resp.ok) {
          const data = await resp.json();
          setStates(data.states || []);
        }
      } catch { /* ignore */ }
    })();
  }, [mode, selectedCountry]);

  // Load cities when state changes
  useEffect(() => {
    if (mode !== "cascading" || !selectedCountry || !selectedState) return;
    setCities([]);
    setSelectedCity("");
    (async () => {
      try {
        const resp = await api.get(`/api/location/cities/${selectedCountry}/${selectedState}`);
        if (resp.ok) {
          const data = await resp.json();
          setCities(data.cities || []);
        }
      } catch { /* ignore */ }
    })();
  }, [mode, selectedCountry, selectedState]);

  // Emit cascading location changes
  const emitCascadeChange = useCallback(async (countryCode: string, stateCode?: string, cityName?: string) => {
    setCascadeLoading(true);
    const countryObj = countries.find((c) => c.code === countryCode);
    const stateObj = states.find((s) => s.code === stateCode);

    const parts = [cityName, stateObj?.name, countryObj?.name].filter(Boolean);
    const locationStr = parts.join(", ") || countryObj?.name || countryCode;

    // Resolve location context
    const data = await resolveLocation(locationStr);
    onLocationChange(locationStr, data?.context || null);

    if (onGeoChange) {
      onGeoChange({
        country: countryCode,
        state: stateCode,
        city: cityName,
        countryName: countryObj?.name,
        stateName: stateObj?.name,
      });
    }
    setCascadeLoading(false);
  }, [countries, states, resolveLocation, onLocationChange, onGeoChange]);

  // ─── Cascading Mode ────────────────────────────────────────────────
  if (mode === "cascading") {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Select Location
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Country */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Country</Label>
              <Select
                value={selectedCountry}
                onValueChange={(val) => {
                  setSelectedCountry(val);
                  emitCascadeChange(val);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select country" />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* State */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">State / Region</Label>
              <Select
                value={selectedState}
                onValueChange={(val) => {
                  setSelectedState(val);
                  emitCascadeChange(selectedCountry, val);
                }}
                disabled={!selectedCountry || states.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedCountry ? "Optional" : "Select country first"} />
                </SelectTrigger>
                <SelectContent>
                  {states.map((s) => (
                    <SelectItem key={s.code} value={s.code}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* City */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">City</Label>
              <Select
                value={selectedCity}
                onValueChange={(val) => {
                  setSelectedCity(val);
                  emitCascadeChange(selectedCountry, selectedState, val);
                }}
                disabled={!selectedState || cities.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={selectedState ? "Optional" : "Select state first"} />
                </SelectTrigger>
                <SelectContent>
                  {cities.map((c) => (
                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 text-sm">
            {(loading || cascadeLoading) && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            {context && !loading && !cascadeLoading && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-green-500" />
                <span>
                  {[selectedCity, states.find((s) => s.code === selectedState)?.name, countries.find((c) => c.code === selectedCountry)?.name].filter(Boolean).join(", ")}
                </span>
              </div>
            )}
          </div>

          {/* Context Preview */}
          {context && (
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-sm">
              {context.localPlatforms && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-muted-foreground">Platforms:</span>
                  {context.localPlatforms.slice(0, 5).map((p) => (
                    <Badge key={p} variant="secondary" className="text-xs">{p}</Badge>
                  ))}
                </div>
              )}
              {context.contentLanguages && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-muted-foreground">Languages:</span>
                  {context.contentLanguages.slice(0, 4).map((l) => (
                    <Badge key={l} variant="secondary" className="text-xs">{l}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── Simple Modes (compact + full) ─────────────────────────────────

  const handleQuickSelect = async (loc: string) => {
    setSelected(loc);
    setCustomLocation("");
    const data = await resolveLocation(loc);
    onLocationChange(loc, data?.context || null);
  };

  const handleCustomSubmit = async () => {
    if (!customLocation.trim()) return;
    setSelected(customLocation);
    const data = await resolveLocation(customLocation);
    onLocationChange(customLocation, data?.context || null);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
        <Select
          value={selected}
          onValueChange={handleQuickSelect}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select location" />
          </SelectTrigger>
          <SelectContent>
            {QUICK_LOCATIONS.map((loc) => (
              <SelectItem key={loc.code} value={loc.value}>
                {loc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        {context && !loading && <Check className="h-4 w-4 text-green-500" />}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Select Location for Trend Intelligence
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Select */}
        <div className="flex flex-wrap gap-2">
          {QUICK_LOCATIONS.map((loc) => (
            <Badge
              key={loc.code}
              variant={selected === loc.value ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary/10 transition-colors"
              onClick={() => handleQuickSelect(loc.value)}
            >
              {loc.label}
            </Badge>
          ))}
        </div>

        {/* Custom Location */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Label htmlFor="custom-location" className="sr-only">Custom location</Label>
            <Input
              id="custom-location"
              placeholder="Enter city, state, or country (e.g., Mumbai, India)"
              value={customLocation}
              onChange={(e) => setCustomLocation(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomSubmit()}
            />
          </div>
          <Button
            onClick={handleCustomSubmit}
            disabled={!customLocation.trim() || loading}
            size="sm"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
          </Button>
        </div>

        {/* Context Preview */}
        {context && (
          <div className="rounded-lg border bg-muted/50 p-3 space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <MapPin className="h-3.5 w-3.5 text-primary" />
              <span className="font-medium">
                {context.location.city && `${context.location.city}, `}
                {context.location.state && `${context.location.state}, `}
                {context.location.country}
              </span>
            </div>
            {context.localPlatforms && (
              <div className="flex flex-wrap gap-1">
                <span className="text-muted-foreground">Platforms:</span>
                {context.localPlatforms.slice(0, 5).map((p) => (
                  <Badge key={p} variant="secondary" className="text-xs">
                    {p}
                  </Badge>
                ))}
              </div>
            )}
            {context.contentLanguages && (
              <div className="flex flex-wrap gap-1">
                <span className="text-muted-foreground">Languages:</span>
                {context.contentLanguages.slice(0, 4).map((l) => (
                  <Badge key={l} variant="secondary" className="text-xs">
                    {l}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
