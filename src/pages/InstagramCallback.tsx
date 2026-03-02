import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function InstagramCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    try {
      const hash = window.location.hash || "";
      const params = new URLSearchParams(hash.replace(/^#/, ""));
      const token = params.get("token");
      if (token) {
        localStorage.setItem("server_token", token);
        toast({ title: "Signed in", description: "Instagram login successful." });
        navigate("/dashboard");
      } else {
        toast({ title: "Login failed", description: "Missing token in callback.", variant: "destructive" });
        navigate("/auth");
      }
    } catch (e: any) {
      toast({ title: "Login error", description: String(e), variant: "destructive" });
      navigate("/auth");
    }
  }, []);

  return <div />;
}
