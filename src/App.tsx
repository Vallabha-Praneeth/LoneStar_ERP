import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence } from "framer-motion";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import type { UserRole } from "@/lib/types";

// Eagerly loaded (small, always needed)
import RoleSelect from "./pages/RoleSelect";
import NotFound from "./pages/NotFound";

// Lazy-loaded pages — each becomes its own chunk
const DriverLogin = lazy(() => import("./pages/driver/DriverLogin"));
const DriverCampaign = lazy(() => import("./pages/driver/DriverCampaign"));
const DriverUpload = lazy(() => import("./pages/driver/DriverUpload"));
const DriverUploadSuccess = lazy(() => import("./pages/driver/DriverUploadSuccess"));

const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminCampaignList = lazy(() => import("./pages/admin/AdminCampaignList"));
const AdminCreateCampaign = lazy(() => import("./pages/admin/AdminCreateCampaign"));
const AdminCampaignDetail = lazy(() => import("./pages/admin/AdminCampaignDetail"));
const AdminPhotoManagement = lazy(() => import("./pages/admin/AdminPhotoManagement"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminEditCampaign = lazy(() => import("./pages/admin/AdminEditCampaign"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminRouteList = lazy(() => import("./pages/admin/AdminRouteList"));
const AdminRouteForm = lazy(() => import("./pages/admin/AdminRouteForm"));
const AdminDriverDetail = lazy(() => import("./pages/admin/AdminDriverDetail"));
const AdminCostTypes = lazy(() => import("./pages/admin/AdminCostTypes"));
const AdminLayout = lazy(() =>
  import("./components/AdminLayout").then((m) => ({ default: m.AdminLayout }))
);

const ClientLogin = lazy(() => import("./pages/client/ClientLogin"));
const ClientCampaignView = lazy(() => import("./pages/client/ClientCampaignView"));
const ClientTimingSheet = lazy(() => import("./pages/client/ClientTimingSheet"));

const ResetPassword = lazy(() => import("./pages/ResetPassword"));

const queryClient = new QueryClient();

function AppRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<RoleSelect />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Driver */}
        <Route path="/driver/login" element={<DriverLogin />} />
        <Route
          path="/driver/campaign"
          element={
            <ProtectedRoute role="driver">
              <DriverCampaign />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/upload"
          element={
            <ProtectedRoute role="driver">
              <DriverUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/driver/upload-success"
          element={
            <ProtectedRoute role="driver">
              <DriverUploadSuccess />
            </ProtectedRoute>
          }
        />

        {/* Admin */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route path="campaigns" element={<AdminCampaignList />} />
          <Route path="campaigns/create" element={<AdminCreateCampaign />} />
          <Route path="campaigns/:id" element={<AdminCampaignDetail />} />
          <Route path="campaigns/:id/edit" element={<AdminEditCampaign />} />
          <Route path="campaigns/:id/photos" element={<AdminPhotoManagement />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="analytics" element={<AdminAnalytics />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="routes" element={<AdminRouteList />} />
          <Route path="routes/create" element={<AdminRouteForm />} />
          <Route path="routes/:id/edit" element={<AdminRouteForm />} />
          <Route path="drivers/:id" element={<AdminDriverDetail />} />
          <Route path="settings/cost-types" element={<AdminCostTypes />} />
        </Route>

        {/* Client */}
        <Route path="/client/login" element={<ClientLogin />} />
        <Route
          path="/client/campaign"
          element={
            <ProtectedRoute role="client">
              <ClientCampaignView />
            </ProtectedRoute>
          }
        />
        <Route
          path="/client/campaign/timing"
          element={
            <ProtectedRoute role="client">
              <ClientTimingSheet />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
}

function PageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/** Redirects unauthenticated users to login; wrong role to "/" */
function ProtectedRoute({
  role,
  children,
}: {
  role: UserRole;
  children: React.ReactNode;
}) {
  const { session, profile, loading } = useAuth();

  if (loading) {
    return <PageSpinner />;
  }

  if (!session) {
    return <Navigate to={`/${role}/login`} replace />;
  }

  // Profile loaded and role mismatch → back to role selector
  if (profile && profile.role !== role) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Suspense fallback={<PageSpinner />}>
              <AppRoutes />
            </Suspense>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
