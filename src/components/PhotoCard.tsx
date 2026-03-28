import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCardProps {
  imageUrl: string;
  time: string;
  note?: string;
  showDelete?: boolean;
  onDelete?: () => void;
}

export function PhotoCard({ imageUrl, time, note, showDelete, onDelete }: PhotoCardProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-card group">
      <div className="aspect-[4/3] bg-muted relative overflow-hidden">
        <img src={imageUrl} alt="Campaign photo" className="w-full h-full object-cover" />
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs text-muted-foreground">{time}</p>
        {note && <p className="text-sm text-foreground">{note}</p>}
        {showDelete && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={onDelete} className="flex-1 h-8 rounded-lg text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="w-3 h-3 mr-1" /> Delete
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
