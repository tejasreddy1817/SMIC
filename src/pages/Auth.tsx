import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Zap, Loader2, Shield, Eye, EyeOff, ArrowLeft, WifiOff, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { z } from "zod";

const INTERNAL_DOMAINS = ["thesmic.com", "thesim.com"]; // lowercase — email is .toLowerCase()'d before comparison

function isInternalEmail(email: string): boolean {
  const domain = email.toLowerCase().trim().split("@")[1];
  return INTERNAL_DOMAINS.includes(domain);
}

function getInternalRole(email: string): string {
  const localPart = email.toLowerCase().trim().split("@")[0];
  if (localPart === "founder" || localPart.startsWith("founder.") || localPart.startsWith("founder+")) return "founder";
  if (localPart === "developer" || localPart.startsWith("developer.") || localPart.startsWith("developer+") || localPart.startsWith("dev.") || localPart.startsWith("dev+")) return "developer";
  if (localPart === "staff" || localPart.startsWith("staff.") || localPart.startsWith("staff+")) return "staff";
  return "staff";
}

export default function Auth() {
  const { user, loading: authLoading, signIn, signUp, serverOnline } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; terms?: string }>({});
  const [showPassword, setShowPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const navigate = useNavigate();

  const internal = useMemo(() => isInternalEmail(email), [email]);
  const detectedRole = useMemo(() => (internal ? getInternalRole(email) : null), [email, internal]);

  // Redirect if already authenticated
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    // Only validate password for external users — must match backend rules
    if (!internal) {
      if (!password || password.length < 8) {
        newErrors.password = "Password must be at least 8 characters";
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password)) {
        newErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, and one digit";
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);

    if (error) {
      let title = "Sign in failed";
      let description = error.message;
      if (error.message === "Invalid login credentials" || error.message === "Invalid") {
        description = "Invalid email or password. Please try again.";
      } else if (error.message?.includes("Cannot connect") || error.message?.includes("Failed to fetch") || error.message?.includes("Failed to connect")) {
        title = "Server unreachable";
        description = "Cannot connect to the backend server. Make sure it's running: cd server && npm run dev";
      } else if (error.message?.includes("Password must")) {
        description = error.message;
      } else if (error.message?.includes("Account suspended")) {
        title = "Account suspended";
        description = "Your account has been suspended. Contact support for assistance.";
      }
      toast({
        title,
        description,
        variant: "destructive",
      });
    } else {
      // Internal users go to admin, external users to dashboard
      if (internal) {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    if (!internal && !agreedToTerms) {
      setErrors((prev) => ({ ...prev, terms: "You must agree to the Terms of Service and Privacy Policy" }));
      return;
    }

    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);

    if (error) {
      if (error.message.includes("already registered") || error.message === "Exists") {
        toast({
          title: "Account exists",
          description: "This email is already registered. Try signing in instead.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } else if (internal) {
      // Internal users are auto-logged in
      navigate("/admin");
    } else {
      toast({
        title: "Check your email",
        description: "We've sent you a confirmation link to verify your account.",
      });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail)) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (isInternalEmail(resetEmail)) {
      toast({ title: "Not applicable", description: "Internal accounts don't use passwords. Just enter your email to sign in.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/auth`,
    });
    setLoading(false);
    if (error) {
      toast({ title: "Reset failed", description: error.message, variant: "destructive" });
    } else {
      setResetSent(true);
      toast({ title: "Reset link sent", description: "Check your email for a password reset link." });
    }
  };

  // Forgot password view
  if (forgotPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="pointer-events-none fixed inset-0 overflow-hidden">
          <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-secondary/10 blur-3xl" />
        </div>
        <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary glow-primary">
              <Zap className="h-8 w-8 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl font-bold">Reset Password</CardTitle>
            <CardDescription className="text-muted-foreground">
              {resetSent
                ? "We've sent a password reset link to your email."
                : "Enter your email and we'll send you a reset link."}
            </CardDescription>
          </CardHeader>
          {!resetSent ? (
            <form onSubmit={handleForgotPassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="you@example.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full glow-primary-hover" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => { setForgotPassword(false); setResetSent(false); setResetEmail(""); }}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back to Sign In
                </button>
              </CardFooter>
            </form>
          ) : (
            <CardFooter className="flex flex-col gap-3">
              <Button
                className="w-full"
                onClick={() => { setForgotPassword(false); setResetSent(false); setResetEmail(""); }}
              >
                Back to Sign In
              </Button>
              <button
                type="button"
                onClick={() => setResetSent(false)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Didn't receive it? Try again
              </button>
            </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {/* Background gradient effects */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-1/2 w-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-1/2 w-1/2 rounded-full bg-secondary/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/50 bg-card/80 backdrop-blur">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary glow-primary">
            <Zap className="h-8 w-8 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">
            <span className="text-gradient-primary">SMIC</span>
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            AI-powered content intelligence for creators
          </CardDescription>
        </CardHeader>

        {/* Server status indicator */}
        {!serverOnline && (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2">
            <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-400">
              Backend server offline — ensure <code className="rounded bg-red-500/20 px-1 text-xs">server</code> is running on port 4000
            </span>
          </div>
        )}

        {/* Internal user badge */}
        {internal && (
          <div className="mx-6 mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            <Shield className="h-4 w-4 text-amber-600" />
            <span className="text-sm text-amber-700 dark:text-amber-400">
              Internal login — <span className="font-semibold capitalize">{detectedRole}</span> access (no password required)
            </span>
          </div>
        )}

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="mx-6 grid w-[calc(100%-3rem)] grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                {!internal && (
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signin-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => { setForgotPassword(true); setResetEmail(email); }}
                        className="text-xs text-muted-foreground hover:text-primary transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full glow-primary-hover"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : internal ? (
                    "Enter as " + (detectedRole || "staff")
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignUp}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? "border-destructive" : ""}
                    disabled={loading}
                  />
                  {errors.email && (
                    <p className="text-xs text-destructive">{errors.email}</p>
                  )}
                </div>
                {!internal && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={`pr-10 ${errors.password ? "border-destructive" : ""}`}
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.password && (
                      <p className="text-xs text-destructive">{errors.password}</p>
                    )}
                  </div>
                )}
                {!internal && (
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <Checkbox
                        id="agree-terms"
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => {
                          setAgreedToTerms(checked === true);
                          if (checked) setErrors((prev) => ({ ...prev, terms: undefined }));
                        }}
                        disabled={loading}
                        className="mt-0.5"
                      />
                      <label htmlFor="agree-terms" className="text-xs text-muted-foreground leading-snug cursor-pointer select-none">
                        I agree to the{" "}
                        <button
                          type="button"
                          onClick={() => window.open("/terms", "_blank")}
                          className="underline underline-offset-2 hover:text-foreground transition-colors"
                        >
                          Terms of Service
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={() => window.open("/privacy", "_blank")}
                          className="underline underline-offset-2 hover:text-foreground transition-colors"
                        >
                          Privacy Policy
                        </button>
                      </label>
                    </div>
                    {errors.terms && (
                      <p className="text-xs text-destructive">{errors.terms}</p>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button
                  type="submit"
                  className="w-full glow-primary-hover"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {internal ? "Setting up..." : "Creating account..."}
                    </>
                  ) : internal ? (
                    "Enter as " + (detectedRole || "staff")
                  ) : (
                    "Create Account"
                  )}
                </Button>
              </CardFooter>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
}
