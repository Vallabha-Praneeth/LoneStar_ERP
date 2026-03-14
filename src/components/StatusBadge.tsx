import { cn } from "@/lib/utils";

type StatusVariant = "active" | "pending" | "completed" | "draft" | "approved" | "rejected";

const variantStyles: Record<StatusVariant, string> = {
  active: "bg-success/10 text-success border-success/20",
  pending: "bg-warning/10 text-warning border-warning/20",
  completed: "bg-primary/10 text-primary border-primary/20",
  draft: "bg-muted text-muted-foreground border-border",
  approved: "bg-success/10 text-success border-success/20",
  rejected: "bg-destructive/10 text-destructive border-destructive/20",
};

export function StatusBadge({ status, className }: { status: StatusVariant; className?: string }) {
  return (
    <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border capitalize", variantStyles[status], className)}>
      {status}
    </span>
  );
}
