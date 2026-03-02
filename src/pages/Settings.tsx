import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCreator } from "@/hooks/useCreator";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon, User, Palette, Database, Loader2, Check, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

const NICHES = [
  "Tech", "Gaming", "Lifestyle", "Fitness", "Comedy", "Education",
  "Food", "Travel", "Fashion", "Beauty", "Finance", "Motivation",
  "Music", "Art", "Sports", "News", "Vlogs", "DIY",
];

const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "hi", name: "Hindi" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "bn", name: "Bengali" },
  { code: "mr", name: "Marathi" },
  { code: "kn", name: "Kannada" },
];

export default function Settings() {
  const { signOut } = useAuth();
  const { creator, updateCreator } = useCreator();
  const { toast } = useToast();
  
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState(creator?.display_name || "");
  const [selectedNiches, setSelectedNiches] = useState<string[]>(creator?.niches || []);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(creator?.languages || ["en"]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(creator?.platform_focus || ["instagram"]);

  const toggleNiche = (niche: string) => {
    setSelectedNiches((prev) =>
      prev.includes(niche)
        ? prev.filter((n) => n !== niche)
        : [...prev, niche]
    );
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(code)
        ? prev.length > 1 ? prev.filter((l) => l !== code) : prev
        : [...prev, code]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await updateCreator({
        display_name: displayName,
        niches: selectedNiches,
        languages: selectedLanguages,
        platform_focus: selectedPlatforms as ("instagram" | "youtube_shorts" | "tiktok")[],
      });

      if (error) throw error;

      toast({
        title: "Settings saved",
        description: "Your profile has been updated.",
      });
    } catch (err) {
      console.error("Error saving settings:", err);
      toast({
        title: "Error saving settings",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6 max-w-3xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <SettingsIcon className="h-6 w-6 text-muted-foreground" />
            Settings
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your profile and preferences
          </p>
        </div>

        {/* Profile Settings */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>Profile</CardTitle>
            </div>
            <CardDescription>
              Update your creator profile information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <Input
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your creator name"
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={creator?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Content Preferences */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5 text-secondary" />
              <CardTitle>Content Preferences</CardTitle>
            </div>
            <CardDescription>
              Customize what types of content you create
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <Label>Niches</Label>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((niche) => (
                  <Badge
                    key={niche}
                    variant={selectedNiches.includes(niche) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedNiches.includes(niche) && "bg-primary"
                    )}
                    onClick={() => toggleNiche(niche)}
                  >
                    {selectedNiches.includes(niche) && <Check className="mr-1 h-3 w-3" />}
                    {niche}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Languages</Label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((lang) => (
                  <Badge
                    key={lang.code}
                    variant={selectedLanguages.includes(lang.code) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer transition-all",
                      selectedLanguages.includes(lang.code) && "bg-secondary"
                    )}
                    onClick={() => toggleLanguage(lang.code)}
                  >
                    {selectedLanguages.includes(lang.code) && <Check className="mr-1 h-3 w-3" />}
                    {lang.name}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>Platforms</Label>
              <div className="flex gap-2">
                {["instagram", "youtube_shorts"].map((platform) => (
                  <Badge
                    key={platform}
                    variant={selectedPlatforms.includes(platform) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer capitalize transition-all",
                      selectedPlatforms.includes(platform) && "bg-accent"
                    )}
                    onClick={() => {
                      setSelectedPlatforms((prev) =>
                        prev.includes(platform)
                          ? prev.length > 1 ? prev.filter((p) => p !== platform) : prev
                          : [...prev, platform]
                      );
                    }}
                  >
                    {selectedPlatforms.includes(platform) && <Check className="mr-1 h-3 w-3" />}
                    {platform.replace("_", " ")}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voice Profile */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-accent" />
              <CardTitle>Voice Profile</CardTitle>
            </div>
            <CardDescription>
              Manage the samples used to train your unique voice
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Voice Sample
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Adding more voice samples improves script quality
            </p>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={signOut}>
            Sign Out
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
