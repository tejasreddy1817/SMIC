import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CreditCard,
  Plus,
  Edit,
  Trash2,
  Check,
  Loader2,
  DollarSign,
  Users,
  Percent,
  Star,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
  active: boolean;
  subscriberCount: number;
  highlighted: boolean;
}

const MOCK_PLANS: Plan[] = [
  {
    id: "plan_free", name: "Free", price: 0, billingCycle: "monthly",
    features: ["5 pipeline runs/day", "Basic trends", "1 niche", "Community support"],
    active: true, subscriberCount: 1200, highlighted: false,
  },
  {
    id: "plan_pro_m", name: "Pro Monthly", price: 49.99, billingCycle: "monthly",
    features: ["100 pipeline runs/day", "Advanced trends + ideas", "Unlimited niches", "AI script generation", "Viral prediction", "Priority support"],
    active: true, subscriberCount: 280, highlighted: true,
  },
  {
    id: "plan_pro_y", name: "Pro Yearly", price: 499.99, billingCycle: "yearly",
    features: ["Everything in Pro Monthly", "2 months free", "Early access to features", "Dedicated support"],
    active: true, subscriberCount: 62, highlighted: false,
  },
  {
    id: "plan_team", name: "Team", price: 199.99, billingCycle: "monthly",
    features: ["Everything in Pro", "5 team members", "Shared content library", "Team analytics", "Admin dashboard", "API access"],
    active: true, subscriberCount: 18, highlighted: false,
  },
  {
    id: "plan_enterprise", name: "Enterprise", price: 0, billingCycle: "monthly",
    features: ["Custom pipeline limits", "Dedicated infrastructure", "SLA guarantee", "Custom integrations", "Account manager"],
    active: false, subscriberCount: 3, highlighted: false,
  },
];

interface CouponCode {
  id: string;
  code: string;
  discount: number;
  type: "percent" | "fixed";
  uses: number;
  maxUses: number;
  active: boolean;
}

const MOCK_COUPONS: CouponCode[] = [
  { id: "c1", code: "LAUNCH50", discount: 50, type: "percent", uses: 145, maxUses: 500, active: true },
  { id: "c2", code: "WELCOME20", discount: 20, type: "percent", uses: 89, maxUses: 0, active: true },
  { id: "c3", code: "FLAT10", discount: 10, type: "fixed", uses: 32, maxUses: 100, active: false },
];

export default function BillingManagement() {
  const { toast } = useToast();
  const [plans] = useState<Plan[]>(MOCK_PLANS);
  const [coupons] = useState<CouponCode[]>(MOCK_COUPONS);

  const totalMRR = plans.reduce((sum, p) => {
    if (p.billingCycle === "monthly") return sum + p.price * p.subscriberCount;
    return sum + (p.price / 12) * p.subscriberCount;
  }, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CreditCard className="h-8 w-8" />
              Billing Management
            </h1>
            <p className="text-muted-foreground mt-1">Manage subscription plans, pricing, and coupon codes</p>
          </div>
          <Button><Plus className="h-4 w-4 mr-2" />Create Plan</Button>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Estimated MRR</CardTitle>
              <DollarSign className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${Math.round(totalMRR).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Subscribers</CardTitle>
              <Users className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plans.reduce((s, p) => s + p.subscriberCount, 0).toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Plans</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{plans.filter((p) => p.active).length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Plans */}
        <Card>
          <CardHeader>
            <CardTitle>Subscription Plans</CardTitle>
            <CardDescription>Manage pricing tiers and features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {plans.map((plan) => (
                <div key={plan.id} className={`rounded-lg border p-4 ${plan.highlighted ? "border-primary/50 bg-primary/5" : ""}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">{plan.name}</span>
                          {plan.highlighted && <Badge className="bg-primary">Popular</Badge>}
                          <Badge variant="outline" className={plan.active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"}>
                            {plan.active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {plan.price === 0 ? "Free / Custom" : `$${plan.price}/${plan.billingCycle === "monthly" ? "mo" : "yr"}`}
                          {" · "}{plan.subscriberCount} subscribers
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline"><Edit className="h-3 w-3 mr-1" />Edit</Button>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {plan.features.map((f) => (
                      <Badge key={f} variant="outline" className="text-xs font-normal">
                        <Check className="h-3 w-3 mr-1 text-green-500" />{f}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Coupon Codes */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Coupon Codes</CardTitle>
                <CardDescription>Manage discount codes and promotions</CardDescription>
              </div>
              <Button variant="outline" size="sm"><Plus className="h-3 w-3 mr-1" />Add Coupon</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {coupons.map((coupon) => (
                <div key={coupon.id} className="flex items-center justify-between rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Percent className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <code className="font-bold">{coupon.code}</code>
                        <Badge variant="outline" className={coupon.active ? "bg-green-500/10 text-green-500 border-green-500/20" : "bg-gray-500/10 text-gray-500 border-gray-500/20"}>
                          {coupon.active ? "Active" : "Expired"}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {coupon.type === "percent" ? `${coupon.discount}% off` : `$${coupon.discount} off`}
                        {" · "}{coupon.uses} uses{coupon.maxUses > 0 ? ` / ${coupon.maxUses} max` : " (unlimited)"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
