import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { CreatorProvider } from "@/hooks/useCreator";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ThemeProvider } from "@/hooks/useTheme";

// Pages
import Auth from "@/pages/Auth";
import Onboarding from "@/pages/Onboarding";
import Dashboard from "@/pages/Dashboard";
import InstagramCallback from "@/pages/InstagramCallback";
import Trends from "@/pages/Trends";
import Ideas from "@/pages/Ideas";
import Scripts from "@/pages/Scripts";
import Predict from "@/pages/Predict";
import Settings from "@/pages/Settings";
import ContentStatus from "@/pages/ContentStatus";
import Calendar from "@/pages/Calendar";
import Notifications from "@/pages/Notifications";
import NewsScript from "@/pages/NewsScript";
import NotFound from "@/pages/NotFound";

// Admin Pages
import AdminDashboard from "@/pages/admin/AdminDashboard";
import UserManagement from "@/pages/admin/UserManagement";
import TicketManagement from "@/pages/admin/TicketManagement";
import AuditLogs from "@/pages/admin/AuditLogs";
import FeatureFlags from "@/pages/admin/FeatureFlags";
import SystemLogs from "@/pages/admin/SystemLogs";
import OrgSettings from "@/pages/admin/OrgSettings";
import PaymentFinance from "@/pages/admin/PaymentFinance";
import ReportsAnalytics from "@/pages/admin/ReportsAnalytics";
import GeneralSettings from "@/pages/admin/GeneralSettings";
import RolesPermissions from "@/pages/admin/RolesPermissions";
import PipelineDebug from "@/pages/admin/PipelineDebug";
import MetricsDashboard from "@/pages/admin/MetricsDashboard";
import BillingManagement from "@/pages/admin/BillingManagement";
import KillSwitch from "@/pages/admin/KillSwitch";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <CreatorProvider>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/instagram/callback" element={<InstagramCallback />} />

              {/* Onboarding (requires auth but not onboarding) */}
              <Route path="/onboarding" element={<Onboarding />} />

              {/* Protected routes (require auth + onboarding) */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/trends"
                element={
                  <ProtectedRoute>
                    <Trends />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/ideas"
                element={
                  <ProtectedRoute>
                    <Ideas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/scripts"
                element={
                  <ProtectedRoute>
                    <Scripts />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/news-script"
                element={
                  <ProtectedRoute>
                    <NewsScript />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/predict"
                element={
                  <ProtectedRoute>
                    <Predict />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/status"
                element={
                  <ProtectedRoute>
                    <ContentStatus />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <Calendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/notifications"
                element={
                  <ProtectedRoute>
                    <Notifications />
                  </ProtectedRoute>
                }
              />

              {/* Admin routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute requiredRole={["staff", "developer", "founder"]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requiredPermission="user:read:any">
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/tickets"
                element={
                  <ProtectedRoute requiredPermission="ticket:read:any">
                    <TicketManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/audit"
                element={
                  <ProtectedRoute requiredPermission="audit:read:self">
                    <AuditLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/feature-flags"
                element={
                  <ProtectedRoute requiredPermission="feature_flags:manage">
                    <FeatureFlags />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/logs"
                element={
                  <ProtectedRoute requiredPermission="logs:read">
                    <SystemLogs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/org"
                element={
                  <ProtectedRoute requiredPermission="org:manage">
                    <OrgSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/finance"
                element={
                  <ProtectedRoute requiredPermission="billing:manage">
                    <PaymentFinance />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/reports"
                element={
                  <ProtectedRoute requiredPermission="reports:read">
                    <ReportsAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/settings"
                element={
                  <ProtectedRoute requiredPermission="settings:read">
                    <GeneralSettings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <ProtectedRoute requiredPermission="roles:manage">
                    <RolesPermissions />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/pipeline-debug"
                element={
                  <ProtectedRoute requiredPermission="debug:read">
                    <PipelineDebug />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/metrics"
                element={
                  <ProtectedRoute requiredPermission="metrics:read">
                    <MetricsDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/billing"
                element={
                  <ProtectedRoute requiredPermission="billing:manage">
                    <BillingManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/kill-switch"
                element={
                  <ProtectedRoute requiredPermission="org:manage">
                    <KillSwitch />
                  </ProtectedRoute>
                }
              />

              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </CreatorProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
