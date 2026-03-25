import { Link, useLocation, useNavigate } from "react-router-dom";
import { LayoutDashboard, PlusCircle, FileText, LogOut, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "./Logo";

const navItems = [
  { label: "Campaigns", path: "/admin/campaigns", icon: LayoutDashboard },
  { label: "Create Campaign", path: "/admin/campaigns/create", icon: PlusCircle },
  { label: "Reports", path: "/admin/reports", icon: FileText },
  { label: "Users", path: "/admin/users", icon: Users },
];

export function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, profile } = useAuth();

  async function handleSignOut() {
    await signOut();
    navigate("/");
  }

  return (
    <aside className="hidden md:flex w-64 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border min-h-screen">
      {/* Brand */}
      <div className="px-5 pt-6 pb-4 border-b border-sidebar-border/50">
        <Logo size="sm" variant="sidebar" />
        {profile && (
          <div className="mt-3 flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-[10px] font-semibold text-sidebar-accent-foreground">
                {profile.display_name?.charAt(0)?.toUpperCase() ?? "A"}
              </span>
            </div>
            <p className="text-xs text-sidebar-foreground/50 truncate">
              {profile.display_name}
            </p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pt-3 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            location.pathname.startsWith(item.path + "/");
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="w-[18px] h-[18px]" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-sidebar-border/50">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-sidebar-foreground/50 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground transition-colors"
        >
          <LogOut className="w-[18px] h-[18px]" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
