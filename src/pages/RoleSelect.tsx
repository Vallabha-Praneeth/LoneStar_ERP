import { useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Truck, Shield, Eye } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const roles = [
  {
    label: "Driver",
    desc: "Mobile campaign operations",
    icon: Truck,
    path: "/driver/login",
    color: "bg-success/10 text-success",
  },
  {
    label: "Admin",
    desc: "Campaign management dashboard",
    icon: Shield,
    path: "/admin/login",
    color: "bg-primary/10 text-primary",
  },
  {
    label: "Client",
    desc: "Campaign proof viewing",
    icon: Eye,
    path: "/client/login",
    color: "bg-accent/10 text-accent",
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-6"
      >
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center mx-auto">
            <span className="text-primary-foreground font-bold text-lg">AD</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">AdTruck Pro</h1>
          <p className="text-sm text-muted-foreground">Campaign proof-sharing platform</p>
        </div>

        <div className="space-y-3">
          {roles.map((role, i) => (
            <motion.div
              key={role.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 + i * 0.1 }}
            >
              <Link
                to={role.path}
                className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border shadow-card hover:shadow-card-hover transition-all group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${role.color}`}>
                  <role.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground">{role.label}</h3>
                  <p className="text-xs text-muted-foreground">{role.desc}</p>
                </div>
                <span className="text-muted-foreground group-hover:text-foreground transition-colors">→</span>
              </Link>
            </motion.div>
          ))}
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Select your role to continue
        </p>
      </motion.div>
    </div>
  );
}
