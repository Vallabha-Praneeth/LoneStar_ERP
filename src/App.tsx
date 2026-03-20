import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";
import RoleSelect from "./pages/RoleSelect";
import NotFound from "./pages/NotFound";

// Driver
import DriverLogin from "./pages/driver/DriverLogin";
import DriverCampaign from "./pages/driver/DriverCampaign";
import DriverUpload from "./pages/driver/DriverUpload";
import DriverUploadSuccess from "./pages/driver/DriverUploadSuccess";

// Admin
import AdminLogin from "./pages/admin/AdminLogin";
import AdminCampaignList from "./pages/admin/AdminCampaignList";
import AdminCreateCampaign from "./pages/admin/AdminCreateCampaign";
import AdminCampaignDetail from "./pages/admin/AdminCampaignDetail";
import AdminPhotoApproval from "./pages/admin/AdminPhotoApproval";
import AdminReports from "./pages/admin/AdminReports";
import AdminEditCampaign from "./pages/admin/AdminEditCampaign";
import { AdminLayout } from "./components/AdminLayout";

// Client
import ClientLogin from "./pages/client/ClientLogin";
import ClientCampaignView from "./pages/client/ClientCampaignView";
import ClientTimingSheet from "./pages/client/ClientTimingSheet";

const queryClient = new QueryClient();

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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RoleSelect />} />

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
              <Route path="campaigns/:id/photos" element={<AdminPhotoApproval />} />
              <Route path="reports" element={<AdminReports />} />
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
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
