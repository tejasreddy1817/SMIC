import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MessageSquare, Send, Loader2, X } from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  text: string;
}

export default function Chatbot({ collapsed }: { collapsed?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { role: "user", text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const serverToken = localStorage.getItem("server_token");
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (serverToken) headers["authorization"] = `Bearer ${serverToken}`;

      const base = import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
      const res = await fetch(`${base}/api/chat/chat`, {
        method: "POST",
        headers,
        body: JSON.stringify({ content: text }),
      });

      if (res.status === 401) {
        setMessages((m) => [...m, { role: "assistant", text: "Please log in to use the chat." }]);
        return;
      }

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        setMessages((m) => [
          ...m,
          { role: "assistant", text: errData.error || `Error: ${res.status}` },
        ]);
        return;
      }

      const json = await res.json();
      const reply = json.message?.content || json.answer?.content || json.answer || "No response";
      setMessages((m) => [...m, { role: "assistant", text: typeof reply === "string" ? reply : JSON.stringify(reply) }]);
    } catch (err) {
      setMessages((m) => [
        ...m,
        { role: "assistant", text: "Could not connect to server. Make sure the backend is running." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setOpen(!open)}>
            <MessageSquare className="h-4 w-4" />
          </Button>
          {!collapsed && <span className="text-sm">Chat</span>}
        </div>
      </div>

      {open && (
        <div className={cn("mt-2 flex h-72 w-full flex-col rounded-md border bg-card shadow-lg")}>
          {/* Header */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <span className="text-xs font-medium text-muted-foreground">SMIC Assistant</span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setOpen(false)}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-auto px-3 py-2 text-sm space-y-2">
            {messages.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Ask me anything about content creation, trends, or ideas.
              </p>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  m.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-1.5 text-sm",
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  )}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-1.5">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 border-t px-3 py-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              className="flex-1 rounded-md border px-2 py-1.5 text-sm text-foreground bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              placeholder="Ask something..."
            />
            <Button onClick={send} size="icon" className="h-8 w-8" disabled={loading || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
