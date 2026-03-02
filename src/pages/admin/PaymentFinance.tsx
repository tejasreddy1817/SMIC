import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Can } from "@/components/auth/Can";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  Search,
  Download,
  Filter,
  Calendar,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
} from "lucide-react";

interface RevenueStats {
  totalRevenue: number;
  monthlyRevenue: number;
  activeSubscriptions: number;
  churnRate: number;
  mrr: number;
  arr: number;
}

interface Transaction {
  id: string;
  userId: string;
  email: string;
  amount: number;
  currency: string;
  status: "completed" | "pending" | "failed" | "refunded";
  type: "subscription" | "one_time" | "refund";
  plan: string;
  createdAt: string;
  description: string;
}

interface SubscriptionRecord {
  id: string;
  email: string;
  plan: string;
  status: "active" | "canceled" | "past_due" | "trialing";
  amount: number;
  billingCycle: "monthly" | "yearly";
  startDate: string;
  nextBilling: string;
}

const MOCK_STATS: RevenueStats = {
  totalRevenue: 124500,
  monthlyRevenue: 18750,
  activeSubscriptions: 342,
  churnRate: 3.2,
  mrr: 18750,
  arr: 225000,
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: "txn_1", userId: "u1", email: "creator1@gmail.com", amount: 49.99, currency: "USD", status: "completed", type: "subscription", plan: "Pro Monthly", createdAt: "2026-02-23T10:30:00Z", description: "Pro plan subscription" },
  { id: "txn_2", userId: "u2", email: "creator2@gmail.com", amount: 499.99, currency: "USD", status: "completed", type: "subscription", plan: "Pro Yearly", createdAt: "2026-02-22T14:00:00Z", description: "Pro annual subscription" },
  { id: "txn_3", userId: "u3", email: "studio@company.com", amount: 199.99, currency: "USD", status: "completed", type: "subscription", plan: "Team Monthly", createdAt: "2026-02-22T09:15:00Z", description: "Team plan subscription" },
  { id: "txn_4", userId: "u4", email: "creator4@gmail.com", amount: 49.99, currency: "USD", status: "pending", type: "subscription", plan: "Pro Monthly", createdAt: "2026-02-21T16:45:00Z", description: "Payment processing" },
  { id: "txn_5", userId: "u5", email: "creator5@gmail.com", amount: -49.99, currency: "USD", status: "refunded", type: "refund", plan: "Pro Monthly", createdAt: "2026-02-20T11:00:00Z", description: "Refund - billing issue" },
  { id: "txn_6", userId: "u6", email: "user6@gmail.com", amount: 49.99, currency: "USD", status: "failed", type: "subscription", plan: "Pro Monthly", createdAt: "2026-02-19T08:30:00Z", description: "Payment failed - card declined" },
];

const MOCK_SUBSCRIPTIONS: SubscriptionRecord[] = [
  { id: "sub_1", email: "creator1@gmail.com", plan: "Pro", status: "active", amount: 49.99, billingCycle: "monthly", startDate: "2025-12-01", nextBilling: "2026-03-01" },
  { id: "sub_2", email: "creator2@gmail.com", plan: "Pro", status: "active", amount: 499.99, billingCycle: "yearly", startDate: "2026-01-15", nextBilling: "2027-01-15" },
  { id: "sub_3", email: "studio@company.com", plan: "Team", status: "active", amount: 199.99, billingCycle: "monthly", startDate: "2026-02-01", nextBilling: "2026-03-01" },
  { id: "sub_4", email: "user4@gmail.com", plan: "Pro", status: "past_due", amount: 49.99, billingCycle: "monthly", startDate: "2025-11-01", nextBilling: "2026-02-01" },
  { id: "sub_5", email: "user5@gmail.com", plan: "Pro", status: "canceled", amount: 49.99, billingCycle: "monthly", startDate: "2025-10-01", nextBilling: "-" },
  { id: "sub_6", email: "newuser@gmail.com", plan: "Pro", status: "trialing", amount: 0, billingCycle: "monthly", startDate: "2026-02-20", nextBilling: "2026-03-06" },
];

const txnStatusConfig: Record<string, { color: string; icon: any }> = {
  completed: { color: "bg-green-500/10 text-green-500 border-green-500/20", icon: CheckCircle2 },
  pending: { color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: Clock },
  failed: { color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
  refunded: { color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: RefreshCw },
};

const subStatusConfig: Record<string, string> = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  canceled: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  past_due: "bg-red-500/10 text-red-500 border-red-500/20",
  trialing: "bg-blue-500/10 text-blue-500 border-blue-500/20",
};

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export default function PaymentFinance() {
  const { toast } = useToast();
  const [stats] = useState<RevenueStats>(MOCK_STATS);
  const [transactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [subscriptions] = useState<SubscriptionRecord[]>(MOCK_SUBSCRIPTIONS);
  const [txnSearch, setTxnSearch] = useState("");
  const [txnFilter, setTxnFilter] = useState("all");
  const [subSearch, setSubSearch] = useState("");
  const [subFilter, setSubFilter] = useState("all");

  const filteredTxns = transactions.filter((t) => {
    if (txnFilter !== "all" && t.status !== txnFilter) return false;
    if (txnSearch && !t.email.toLowerCase().includes(txnSearch.toLowerCase())) return false;
    return true;
  });

  const filteredSubs = subscriptions.filter((s) => {
    if (subFilter !== "all" && s.status !== subFilter) return false;
    if (subSearch && !s.email.toLowerCase().includes(subSearch.toLowerCase())) return false;
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Payment & Finance
          </h1>
          <p className="text-muted-foreground mt-1">Revenue overview, transactions, and subscription management</p>
        </div>

        {/* Revenue Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</div>
              <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3" /> +12.5% from last month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">ARR</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.arr)}</div>
              <p className="text-xs text-muted-foreground mt-1">Annual Recurring Revenue</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Users className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeSubscriptions}</div>
              <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3" /> +28 this month
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Churn Rate</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.churnRate}%</div>
              <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
                <ArrowDownRight className="h-3 w-3" /> -0.8% from last month
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={txnSearch}
                  onChange={(e) => setTxnSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={txnFilter} onValueChange={setTxnFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="refunded">Refunded</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Export
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Transactions ({filteredTxns.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredTxns.map((txn) => {
                    const statusConf = txnStatusConfig[txn.status];
                    const StatusIcon = statusConf.icon;
                    return (
                      <div key={txn.id} className="flex items-center justify-between rounded-lg border p-4">
                        <div className="flex items-center gap-4">
                          <div>
                            <p className="font-medium">{txn.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className={statusConf.color}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {txn.status}
                              </Badge>
                              <Badge variant="outline">{txn.plan}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(txn.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{txn.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-lg font-bold ${txn.amount < 0 ? "text-red-500" : ""}`}>
                            {formatCurrency(txn.amount)}
                          </span>
                          <p className="text-xs text-muted-foreground">{txn.id}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Subscriptions Tab */}
          <TabsContent value="subscriptions" className="space-y-4">
            <div className="flex gap-4 items-center">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email..."
                  value={subSearch}
                  onChange={(e) => setSubSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={subFilter} onValueChange={setSubFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trialing">Trialing</SelectItem>
                  <SelectItem value="past_due">Past Due</SelectItem>
                  <SelectItem value="canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Subscriptions ({filteredSubs.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredSubs.map((sub) => (
                    <div key={sub.id} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{sub.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className={subStatusConfig[sub.status]}>
                            {sub.status.replace("_", " ")}
                          </Badge>
                          <Badge variant="outline">{sub.plan}</Badge>
                          <Badge variant="outline" className="capitalize">{sub.billingCycle}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Started: {new Date(sub.startDate).toLocaleDateString()} | Next billing: {sub.nextBilling !== "-" ? new Date(sub.nextBilling).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold">{formatCurrency(sub.amount)}</span>
                        <p className="text-xs text-muted-foreground">/{sub.billingCycle === "monthly" ? "mo" : "yr"}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
