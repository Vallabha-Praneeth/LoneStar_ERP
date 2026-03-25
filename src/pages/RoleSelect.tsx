import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Shield, Eye, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Logo } from "@/components/Logo";

const roles = [
  {
    label: "Driver",
    desc: "Start shifts, upload campaign photos",
    icon: Truck,
    path: "/driver/login",
    accent: "border-l-emerald-500",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Admin",
    desc: "Manage campaigns, drivers & reports",
    icon: Shield,
    path: "/admin/login",
    accent: "border-l-primary",
    iconBg: "bg-primary/10 text-primary",
  },
  {
    label: "Client",
    desc: "View campaign proofs & timing sheets",
    icon: Eye,
    path: "/client/login",
    accent: "border-l-amber-500",
    iconBg: "bg-amber-50 text-amber-600",
  },
];

export default function RoleSelect() {
  const { session, signOut } = useAuth();

  // Clear any stale session when user lands on role selector
  useEffect(() => {
    if (session) {
      signOut();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-sm space-y-8"
      >
        {/* Brand header */}
        <div className="flex flex-col items-center gap-3">
          <Logo size="lg" showText={false} />
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              AdTruck Pro
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Campaign proof-sharing platform
            </p>
          </div>
        </div>

        {/* Role cards */}
        <div className="space-y-2.5">
          {roles.map((role, i) => (
            <motion.div
              key={role.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.12 + i * 0.08, ease: "easeOut" }}
            >
              <Link
                to={role.path}
                className={`
                  group flex items-center gap-4 p-4
                  bg-card rounded-xl border border-border border-l-[3px] ${role.accent}
                  shadow-sm hover:shadow-md transition-all duration-200
                  hover:-translate-y-[1px]
                `}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${role.iconBg}`}
                >
                  <role.icon className="w-[18px] h-[18px]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-[15px] leading-tight">
                    {role.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                    {role.desc}
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-[11px] text-center text-muted-foreground/60">
          Select your role to continue
        </p>
      </motion.div>
    </div>
  );
}
