import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, Plus, Trash } from "lucide-react";
import { useState } from "react";

interface ModelListEditorProps {
  models: string[];
  defaultModel: string;
  onModelsChange: (models: string[]) => void;
  onDefaultModelChange: (model: string) => void;
}

export function ModelListEditor({
  models,
  defaultModel,
  onModelsChange,
  onDefaultModelChange,
}: ModelListEditorProps) {
  const [newModel, setNewModel] = useState("");

  // Ensure models is always an array
  const safeModels = models || [];

  const handleAdd = () => {
    if (!newModel.trim()) return;
    if (safeModels.includes(newModel.trim())) {
      setNewModel("");
      return;
    }
    const updated = [...safeModels, newModel.trim()];
    onModelsChange(updated);
    setNewModel("");
  };

  const handleRemove = (model: string) => {
    const updated = safeModels.filter((m) => m !== model);
    onModelsChange(updated);
    if (defaultModel === model && updated.length > 0) {
      onDefaultModelChange(updated[0]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-3">
      <Label>Models</Label>

      {/* Add new model */}
      <div className="flex gap-2">
        <Input
          placeholder="Add new model (e.g., gpt-4o)"
          value={newModel}
          onChange={(e) => setNewModel(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button
          size="icon"
          variant="outline"
          onClick={handleAdd}
          disabled={!newModel.trim()}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {/* Models list */}
      {safeModels.length === 0 ? (
        <div className="text-sm text-muted-foreground py-2">
          No models added yet.
        </div>
      ) : (
        <div className="space-y-2 py-1">
          {safeModels.map((model) => (
            <div
              key={model}
              className={`flex items-center justify-between px-3 py-2 rounded-md border ${
                defaultModel === model
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Button
                  size="icon"
                  variant={defaultModel === model ? "default" : "ghost"}
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => onDefaultModelChange(model)}
                  title={
                    defaultModel === model ? "Default model" : "Set as default"
                  }
                >
                  <Check className="w-3 h-3" />
                </Button>
                <span className="text-sm truncate">{model}</span>
                {defaultModel === model && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">
                    (default)
                  </span>
                )}
              </div>
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 text-destructive hover:text-destructive flex-shrink-0"
                onClick={() => handleRemove(model)}
              >
                <Trash className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
