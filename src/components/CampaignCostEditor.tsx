import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export interface CostRow {
  cost_type_id: string;
  amount: string;
  notes: string;
}

interface CostTypeOption {
  id: string;
  name: string;
}

interface CampaignCostEditorProps {
  costs: CostRow[];
  onChange: (costs: CostRow[]) => void;
  costTypes: CostTypeOption[];
}

export function CampaignCostEditor({ costs, onChange, costTypes }: CampaignCostEditorProps) {
  function addRow() {
    onChange([...costs, { cost_type_id: "", amount: "", notes: "" }]);
  }

  function removeRow(index: number) {
    onChange(costs.filter((_, i) => i !== index));
  }

  function updateRow(index: number, field: keyof CostRow, value: string) {
    const updated = costs.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      {costs.map((row, i) => (
        <div key={i} className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <Select
              value={row.cost_type_id}
              onValueChange={(val) => updateRow(i, "cost_type_id", val)}
            >
              <SelectTrigger className="h-10 rounded-xl bg-secondary/50 border-border">
                <SelectValue placeholder="Cost type" />
              </SelectTrigger>
              <SelectContent>
                {costTypes.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-28 shrink-0">
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={row.amount}
              onChange={(e) => updateRow(i, "amount", e.target.value)}
              className="h-10 rounded-xl bg-secondary/50 border-border"
            />
          </div>
          <div className="flex-1 min-w-0">
            <Input
              placeholder="Notes (optional)"
              value={row.notes}
              onChange={(e) => updateRow(i, "notes", e.target.value)}
              className="h-10 rounded-xl bg-secondary/50 border-border"
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-10 w-10 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => removeRow(i)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ))}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="rounded-xl"
        onClick={addRow}
      >
        <Plus className="w-3.5 h-3.5 mr-1.5" />
        Add Cost
      </Button>
    </div>
  );
}
