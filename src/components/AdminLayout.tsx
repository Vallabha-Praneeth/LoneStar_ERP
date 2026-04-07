import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { AdminSidebar } from "./AdminSidebar";
import { LayoutDashboard, PlusCircle, FileText, Users, LogOut, Menu, X, MapPin, Settings, BarChart3, Moon, Sun } from "lucide-react";
import { Logo } from "./Logo";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/hooks/useTheme";

const mobileNavItems = [
  { label: "Campaigns", path: "/admin/campaigns", icon: LayoutDashboard },
  { label: "Create", path: "/admin/campaigns/create", icon: PlusCircle },
  { label: "Routes", path: "/admin/routes", icon: MapPin },
  { label: "Analytics", path: "/admin/analytics", icon: BarChart3 },
  { label: "Reports", path: "/admin/reports", icon: FileText },
  { label: "Users", path: "/admin/users", icon: Users },
  { label: "Settings", path: "/admin/settings/cost-types", icon: Settings },
];

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  async function handleSignOut() {
    setMobileOpen(false);
    await signOut();
    navigate("/");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-card border-b border-border">
          <Logo size="sm" />
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="text-foreground"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>
        {mobileOpen && (
          <div className="md:hidden bg-card border-b border-border px-4 py-2 space-y-1">
            {mobileNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium",
                  location.pathname.startsWith(item.path)
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Link>
            ))}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-muted-foreground"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
        <main className="flex-1 p-4 md:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
