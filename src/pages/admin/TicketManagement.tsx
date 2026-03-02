import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Ticket, MessageSquare, Bot, CheckCircle } from "lucide-react";

interface TicketRecord {
  _id: string;
  userId: string;
  subject: string;
  description: string;
  status: string;
  assignedTo?: string;
  messages: { from: string; body: string; createdAt: string }[];
  createdAt: string;
}

export default function TicketManagement() {
  const { toast } = useToast();
  const [tickets, setTickets] = useState<TicketRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/api/support/admin/tickets");
      if (resp.ok) setTickets(await resp.json());
    } catch {
      toast({ title: "Error", description: "Failed to load tickets", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleReply = async (ticketId: string) => {
    const message = replyMap[ticketId];
    if (!message?.trim()) return;
    const resp = await api.post(`/api/support/admin/tickets/${ticketId}`, {
      action: "message",
      message,
    });
    if (resp.ok) {
      toast({ title: "Reply sent" });
      setReplyMap((prev) => ({ ...prev, [ticketId]: "" }));
      fetchTickets();
    }
  };

  const handleResolve = async (ticketId: string) => {
    const resp = await api.post(`/api/support/admin/tickets/${ticketId}`, {
      status: "resolved",
    });
    if (resp.ok) {
      toast({ title: "Ticket resolved" });
      fetchTickets();
    }
  };

  const handleAiResolve = async (ticketId: string) => {
    const resp = await api.post(`/api/support/admin/tickets/${ticketId}/agent-solve`, {});
    if (resp.ok) {
      toast({ title: "AI resolution generated" });
      fetchTickets();
    } else {
      const data = await resp.json();
      toast({ title: "Error", description: data.error, variant: "destructive" });
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "open": return "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
      case "resolved": return "bg-green-500/10 text-green-600 border-green-500/20";
      case "closed": return "bg-gray-500/10 text-gray-600 border-gray-500/20";
      default: return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Ticket className="h-8 w-8" />
            Support Tickets
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and resolve customer support tickets
          </p>
        </div>

        {loading ? (
          <p className="text-muted-foreground">Loading tickets...</p>
        ) : tickets.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No open tickets
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket._id}>
                <CardHeader
                  className="cursor-pointer"
                  onClick={() =>
                    setExpandedId(expandedId === ticket._id ? null : ticket._id)
                  }
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                      <CardDescription className="mt-1">
                        {ticket.description.slice(0, 120)}
                        {ticket.description.length > 120 && "..."}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={statusColor(ticket.status)}>
                        {ticket.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ticket.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                {expandedId === ticket._id && (
                  <CardContent className="space-y-4">
                    {/* Messages */}
                    {ticket.messages.length > 0 && (
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {ticket.messages.map((msg, i) => (
                          <div
                            key={i}
                            className={`rounded-lg p-3 text-sm ${
                              msg.from === "agent"
                                ? "bg-blue-500/10 border border-blue-500/20"
                                : "bg-muted"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-xs capitalize">
                                {msg.from === "agent" ? "AI Agent" : msg.from}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <p>{msg.body}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Reply */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Type a reply..."
                        value={replyMap[ticket._id] || ""}
                        onChange={(e) =>
                          setReplyMap((prev) => ({
                            ...prev,
                            [ticket._id]: e.target.value,
                          }))
                        }
                        rows={2}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleReply(ticket._id)}
                        disabled={!replyMap[ticket._id]?.trim()}
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Reply
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleAiResolve(ticket._id)}
                      >
                        <Bot className="h-4 w-4 mr-1" />
                        AI Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResolve(ticket._id)}
                      >
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Mark Resolved
                      </Button>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
