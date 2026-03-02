import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCreator } from "@/hooks/useCreator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Zap, Loader2, ArrowRight, ArrowLeft, Check, Instagram, Youtube } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = ["Profile", "Niche", "Platforms", "Voice"];

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

const PLATFORMS = [
  { id: "instagram", name: "Instagram Reels", icon: Instagram },
  { id: "youtube_shorts", name: "YouTube Shorts", icon: Youtube },
];

export default function Onboarding() {
  const { user } = useAuth();
  const { creator, isOnboarded, updateCreator, completeOnboarding, loading: creatorLoading } = useCreator();
  const { toast } = useToast();
  
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [displayName, setDisplayName] = useState("");
  const [selectedNiches, setSelectedNiches] = useState<string[]>([]);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["en"]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<("instagram" | "youtube_shorts")[]>(["instagram"]);
  const [voiceSamples, setVoiceSamples] = useState<string[]>(["", "", ""]);

  // Redirect if already onboarded
  if (isOnboarded) {
    return <Navigate to="/dashboard" replace />;
  }

  // Wait for creator to load
  if (creatorLoading || !user || !creator) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

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

  const togglePlatform = (id: "instagram" | "youtube_shorts") => {
    setSelectedPlatforms((prev) =>
      prev.includes(id)
        ? prev.length > 1 ? prev.filter((p) => p !== id) : prev
        : [...prev, id]
    );
  };

  const updateVoiceSample = (index: number, value: string) => {
    setVoiceSamples((prev) => {
      const newSamples = [...prev];
      newSamples[index] = value;
      return newSamples;
    });
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return displayName.trim().length >= 2;
      case 1:
        return selectedNiches.length >= 1;
      case 2:
        return selectedPlatforms.length >= 1;
      case 3:
        return voiceSamples.filter((s) => s.trim().length >= 20).length >= 1;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = async () => {
    setLoading(true);

    try {
      // Update creator profile
      const { error: updateError } = await updateCreator({
        display_name: displayName,
        niches: selectedNiches,
        languages: selectedLanguages,
        platform_focus: selectedPlatforms,
      });

      if (updateError) throw updateError;

      // Save voice samples
      const validSamples = voiceSamples.filter((s) => s.trim().length >= 20);
      for (const content of validSamples) {
        await supabase.from("creator_voice_samples").insert({
          creator_id: creator.id,
          content_type: "caption",
          content,
          language: selectedLanguages[0],
        });
      }

      // Mark as onboarded
      const { error: onboardError } = await completeOnboarding();
      if (onboardError) throw onboardError;

      toast({
        title: "Welcome to SMIC! 🎉",
        description: "Your creator profile is set up. Let's find some trends!",
      });
    } catch (err) {
      console.error("Onboarding error:", err);
      toast({
        title: "Something went wrong",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-lg border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary glow-primary">
            <Zap className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl font-bold">Set up your profile</CardTitle>
          <CardDescription>Step {step + 1} of {STEPS.length}: {STEPS[step]}</CardDescription>
          <Progress value={progress} className="mt-4 h-2" />
        </CardHeader>

        <CardContent className="min-h-[300px]">
          {/* Step 1: Profile */}
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <div className="space-y-2">
                <Label htmlFor="displayName">What should we call you?</Label>
                <Input
                  id="displayName"
                  placeholder="Your creator name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  This is how you'll appear in the app. You can change it later.
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Niche */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label>Select your content niches</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Choose 1-5 niches that best describe your content
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {NICHES.map((niche) => (
                  <Badge
                    key={niche}
                    variant={selectedNiches.includes(niche) ? "default" : "outline"}
                    className={cn(
                      "cursor-pointer text-sm py-1.5 px-3 transition-all",
                      selectedNiches.includes(niche) && "bg-primary"
                    )}
                    onClick={() => toggleNiche(niche)}
                  >
                    {selectedNiches.includes(niche) && <Check className="mr-1 h-3 w-3" />}
                    {niche}
                  </Badge>
                ))}
              </div>
              <div className="pt-4">
                <Label>Content languages</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Select the languages you create content in
                </p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <Badge
                      key={lang.code}
                      variant={selectedLanguages.includes(lang.code) ? "default" : "outline"}
                      className={cn(
                        "cursor-pointer text-sm py-1.5 px-3 transition-all",
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
            </div>
          )}

          {/* Step 3: Platforms */}
          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label>Which platforms do you focus on?</Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Select at least one platform
                </p>
              </div>
              <div className="grid gap-3">
                {PLATFORMS.map((platform) => (
                  <button
                    key={platform.id}
                    type="button"
                    onClick={() => togglePlatform(platform.id as "instagram" | "youtube_shorts")}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border p-4 text-left transition-all",
                      selectedPlatforms.includes(platform.id as "instagram" | "youtube_shorts")
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      selectedPlatforms.includes(platform.id as "instagram" | "youtube_shorts")
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      <platform.icon className="h-6 w-6" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{platform.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {platform.id === "instagram" 
                          ? "Reels up to 90 seconds" 
                          : "Shorts up to 60 seconds"}
                      </p>
                    </div>
                    {selectedPlatforms.includes(platform.id as "instagram" | "youtube_shorts") && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Voice Samples */}
          {step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label>Train your voice</Label>
                <p className="text-xs text-muted-foreground mb-4">
                  Paste 1-3 captions or scripts you've written. This helps us match your unique style.
                </p>
              </div>
              <div className="space-y-3">
                {voiceSamples.map((sample, index) => (
                  <div key={index} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Sample {index + 1} {index === 0 && "(required)"}
                    </Label>
                    <Textarea
                      placeholder="Paste a caption or script you've written..."
                      value={sample}
                      onChange={(e) => updateVoiceSample(index, e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <p className="text-xs text-muted-foreground text-right">
                      {sample.length} characters {sample.length < 20 && sample.length > 0 && "(min 20)"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={step === 0 || loading}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || loading}
              className="glow-primary-hover"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Complete Setup
                  <Check className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
