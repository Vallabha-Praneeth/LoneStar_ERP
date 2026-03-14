import { Check, X, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";

interface PhotoCardProps {
  imageUrl: string;
  time: string;
  note?: string;
  status: "pending" | "approved" | "rejected";
  showActions?: boolean;
  onApprove?: () => void;
  onReject?: () => void;
}

export function PhotoCard({ imageUrl, time, note, status, showActions, onApprove, onReject }: PhotoCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card group">
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        <img src={imageUrl} alt="Campaign photo" className="w-full h-full object-cover" />
        <div className="absolute top-2 right-2">
          <StatusBadge status={status} />
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground">{time}</p>
        {note && <p className="text-sm text-foreground">{note}</p>}
        {showActions && status === "pending" && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={onApprove} className="flex-1 h-8 rounded-lg bg-success text-success-foreground hover:bg-success/90 text-xs">
              <Check className="w-3 h-3 mr-1" /> Approve
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} className="flex-1 h-8 rounded-lg text-xs">
              <X className="w-3 h-3 mr-1" /> Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
