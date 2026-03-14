import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ArrowLeft } from "lucide-react";

export default function DriverUploadSuccess() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm bg-card rounded-2xl border border-border shadow-card p-8 text-center space-y-5"
      >
        <div className="w-16 h-16 bg-success/10 rounded-2xl flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-8 h-8 text-success" />
        </div>

        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-foreground">Photo Uploaded</h2>
          <p className="text-sm text-muted-foreground">Your photo has been submitted and is pending admin approval.</p>
        </div>

        <div className="bg-warning/10 rounded-xl px-4 py-3">
          <p className="text-xs font-medium text-warning">⏳ Pending Approval</p>
        </div>

        <Link to="/driver/campaign">
          <Button className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-medium">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Campaign
          </Button>
        </Link>
      </motion.div>
    </div>
  );
}
