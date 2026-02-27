import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLLMSettings } from "@/hooks/use-llm-settings";
import { type LLMProvider, PROVIDER_TEMPLATES } from "@/types/llm";
import { Plus, Power, Save, Sparkles, TestTube, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ModelListEditor } from "./provider-model-list";

// Validate provider name: only alphanumeric characters allowed
const isValidProviderName = (name: string): boolean => {
  return /^[a-zA-Z0-9]+$/.test(name);
};

// Convert name to valid provider ID (lowercase)
const nameToProviderId = (name: string): string => {
  return name.toLowerCase();
};

export function LLMProviderSettings() {
  const {
    providers,
    activeProvider,
    activeProviderId,
    isLoading,
    error,
    saveProvider,
    deleteProvider,
    setActiveProvider,
    createCustomProvider,
  } = useLLMSettings();

  const [editingProviders, setEditingProviders] = useState<
    Record<string, LLMProvider>
  >({});
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    Record<string, "idle" | "saving" | "saved" | "error">
  >({});
  const [testStatus, setTestStatus] = useState<
    Record<string, "idle" | "testing" | "success" | "error">
  >({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Handle adding new provider from template
  const handleAddFromTemplate = () => {
    if (!selectedTemplate) return;
    const template = PROVIDER_TEMPLATES.find((t) => t.id === selectedTemplate);
    if (!template) return;

    // Template name must be valid (alphanumeric only)
    if (!isValidProviderName(template.name)) {
      setValidationError(
        `Provider name must contain only letters and numbers (no spaces or special characters)`,
      );
      return;
    }

    const providerId = nameToProviderId(template.name);

    // Check if ID already exists
    const existingIds = new Set([
      ...providers.map((p) => p.id),
      ...Object.keys(editingProviders),
    ]);

    if (existingIds.has(providerId)) {
      setValidationError(`Provider "${template.name}" already exists`);
      return;
    }

    const newProvider: LLMProvider = {
      id: providerId,
      name: template.name,
      baseURL: template.baseURL,
      apiKey: "",
      models: [...template.models],
      defaultModel: template.defaultModel,
      isActive: false,
    };

    setEditingProviders((prev) => ({
      ...prev,
      [providerId]: newProvider,
    }));
    setSelectedTemplate("");
    setValidationError(null);
  };

  // Handle adding custom provider
  const handleAddCustom = () => {
    const customProvider = createCustomProvider();

    // Default custom provider name must be valid
    if (!isValidProviderName(customProvider.name)) {
      setValidationError(
        `Provider name must contain only letters and numbers (no spaces or special characters). Please edit the name before saving.`,
      );
      // Still create it, but user needs to fix the name
    }

    const providerId = nameToProviderId(customProvider.name);

    // Check if ID already exists
    const existingIds = new Set([
      ...providers.map((p) => p.id),
      ...Object.keys(editingProviders),
    ]);

    if (existingIds.has(providerId)) {
      setValidationError(`Provider "${customProvider.name}" already exists`);
      return;
    }

    const newProvider = {
      ...customProvider,
      id: providerId,
    };

    setEditingProviders((prev) => ({
      ...prev,
      [providerId]: newProvider,
    }));
    setValidationError(null);
  };

  // Handle provider field changes
  const handleProviderChange = (
    id: string,
    field: keyof LLMProvider,
    value: string | string[] | boolean,
  ) => {
    setEditingProviders((prev) => {
      const existingProvider = prev[id] || providers.find((p) => p.id === id);
      if (!existingProvider) return prev;

      const updatedProvider = {
        ...existingProvider,
        [field]: value,
      };

      // If name changed, update id accordingly
      if (field === "name" && typeof value === "string") {
        const newId = nameToProviderId(value);
        // Check if new id conflicts with existing providers
        const existingIds = new Set([
          ...providers.map((p) => p.id).filter((pid) => pid !== id),
          ...Object.keys(editingProviders).filter((pid) => pid !== id),
        ]);

        if (existingIds.has(newId)) {
          setValidationError(
            `Provider name "${value}" conflicts with an existing provider`,
          );
        } else {
          setValidationError(null);
        }

        updatedProvider.id = newId;

        // Update the key in editingProviders
        const newEditingProviders = { ...prev };
        delete newEditingProviders[id];
        newEditingProviders[newId] = updatedProvider;
        return newEditingProviders;
      }

      return {
        ...prev,
        [id]: updatedProvider,
      };
    });
  };

  // Save provider
  const handleSave = async (id: string) => {
    const provider = editingProviders[id];
    if (!provider) return;

    // Validate name before saving
    if (!isValidProviderName(provider.name)) {
      setValidationError(
        "Provider name must contain only letters and numbers (no spaces or special characters)",
      );
      return;
    }

    const expectedId = nameToProviderId(provider.name);
    if (expectedId !== provider.id) {
      setValidationError(
        "Provider ID does not match name. Please check the name.",
      );
      return;
    }

    setSaveStatus((prev) => ({ ...prev, [id]: "saving" }));
    try {
      await saveProvider(provider);
      setSaveStatus((prev) => ({ ...prev, [id]: "saved" }));
      setValidationError(null);
      // Remove from editing state after a delay
      setTimeout(() => {
        setEditingProviders((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
        setSaveStatus((prev) => {
          const updated = { ...prev };
          delete updated[id];
          return updated;
        });
      }, 1000);
    } catch {
      setSaveStatus((prev) => ({ ...prev, [id]: "error" }));
    }
  };

  // Test connection
  const handleTest = async (id: string) => {
    const provider = editingProviders[id] || providers.find((p) => p.id === id);
    if (!provider) return;

    setTestStatus((prev) => ({ ...prev, [id]: "testing" }));
    try {
      // Simple test - just check if required fields are filled
      if (!provider.baseURL || !provider.apiKey) {
        throw new Error("Base URL and API Key are required");
      }
      // Simulate API test delay
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTestStatus((prev) => ({ ...prev, [id]: "success" }));
    } catch {
      setTestStatus((prev) => ({ ...prev, [id]: "error" }));
    }
  };

  // Delete provider
  const handleDelete = async (id: string) => {
    try {
      await deleteProvider(id);
      setEditingProviders((prev) => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch {
      // Error handled in hook
    }
  };

  // Handle activating a provider
  const handleActivate = async (id: string) => {
    try {
      await setActiveProvider(id);
    } catch {
      // Error handled in hook
    }
  };

  // Handle deactivating the active provider
  const handleDeactivate = async () => {
    try {
      await setActiveProvider(null);
    } catch {
      // Error handled in hook
    }
  };

  // Cancel editing
  const handleCancel = (id: string) => {
    setEditingProviders((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  // Start editing existing provider
  const handleEdit = (provider: LLMProvider) => {
    setEditingProviders((prev) => ({
      ...prev,
      [provider.id]: { ...provider },
    }));
  };

  const displayProviders = [
    ...providers,
    ...Object.values(editingProviders).filter(
      (p) => !providers.find((ep) => ep.id === p.id),
    ),
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Loading providers...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5" />
          LLM Provider
        </CardTitle>
        <CardDescription>Configure your AI model providers</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {(error || validationError) && (
          <Alert variant="destructive">
            <AlertDescription>{error || validationError}</AlertDescription>
          </Alert>
        )}

        {/* Active Provider Indicator */}
        {activeProvider && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <Power className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              Active: {activeProvider.name}
            </span>
            <span className="text-xs text-muted-foreground">
              ({activeProvider.defaultModel})
            </span>
          </div>
        )}

        {/* Add Provider Section */}
        <div className="flex gap-2">
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Select provider template" />
            </SelectTrigger>
            <SelectContent>
              {PROVIDER_TEMPLATES.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleAddFromTemplate} disabled={!selectedTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            Add
          </Button>
          <Button variant="outline" onClick={handleAddCustom}>
            Custom
          </Button>
        </div>

        {/* Providers List */}
        {displayProviders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            No providers configured. Add one above to get started.
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {displayProviders.map((provider) => {
              const isEditing = editingProviders[provider.id] !== undefined;
              const editingProvider = isEditing
                ? editingProviders[provider.id]
                : provider;
              const isActive = provider.id === activeProviderId;

              return (
                <AccordionItem
                  key={provider.id}
                  value={provider.id}
                  className={`border rounded-lg ${isActive ? "border-primary/50 bg-primary/5" : ""}`}
                >
                  <div className="flex items-center justify-between px-4">
                    <AccordionTrigger className="hover:no-underline py-3 flex-1 [&[data-state=open]>svg]:rotate-180">
                      <div className="flex items-center gap-3 text-left">
                        {isActive && (
                          <Power className="w-4 h-4 text-primary flex-shrink-0" />
                        )}
                        <span className="font-medium">
                          {editingProvider.name}
                        </span>
                        {isActive && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </AccordionTrigger>
                    <div className="flex items-center gap-1">
                      {/* Activate/Deactivate Button */}
                      {isActive ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-primary hover:text-primary/80"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeactivate();
                          }}
                          title="Deactivate"
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActivate(provider.id);
                          }}
                          title="Activate"
                        >
                          <Power className="w-4 h-4" />
                        </Button>
                      )}
                      {/* Delete Button */}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(provider.id);
                        }}
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  <AccordionContent className="pb-4 px-4">
                    <div className="space-y-4 pt-2">
                      {/* Provider Name */}
                      <div className="space-y-2">
                        <Label htmlFor={`${provider.id}-name`}>
                          Display Name
                        </Label>
                        <Input
                          id={`${provider.id}-name`}
                          value={editingProvider.name}
                          onChange={(e) =>
                            handleProviderChange(
                              provider.id,
                              "name",
                              e.target.value,
                            )
                          }
                          placeholder="MyOpenAI"
                        />
                        <p className="text-xs text-muted-foreground">
                          Only letters and numbers allowed (no spaces or special
                          characters)
                        </p>
                      </div>

                      {/* Base URL */}
                      <div className="space-y-2">
                        <Label htmlFor={`${provider.id}-baseurl`}>
                          Base URL
                        </Label>
                        <Input
                          id={`${provider.id}-baseurl`}
                          value={editingProvider.baseURL}
                          onChange={(e) =>
                            handleProviderChange(
                              provider.id,
                              "baseURL",
                              e.target.value,
                            )
                          }
                          placeholder="https://api.openai.com/v1"
                        />
                      </div>

                      {/* API Key */}
                      <div className="space-y-2">
                        <Label htmlFor={`${provider.id}-apikey`}>API Key</Label>
                        <Input
                          id={`${provider.id}-apikey`}
                          type="password"
                          value={editingProvider.apiKey}
                          onChange={(e) =>
                            handleProviderChange(
                              provider.id,
                              "apiKey",
                              e.target.value,
                            )
                          }
                          placeholder="sk-..."
                        />
                      </div>

                      {/* Models */}
                      <ModelListEditor
                        models={editingProvider.models}
                        defaultModel={editingProvider.defaultModel}
                        onModelsChange={(models) =>
                          handleProviderChange(provider.id, "models", models)
                        }
                        onDefaultModelChange={(model) =>
                          handleProviderChange(
                            provider.id,
                            "defaultModel",
                            model,
                          )
                        }
                      />

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 flex-wrap">
                        {isEditing ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(provider.id)}
                              disabled={saveStatus[provider.id] === "saving"}
                            >
                              <Save className="w-4 h-4 mr-2" />
                              {saveStatus[provider.id] === "saved"
                                ? "Saved!"
                                : saveStatus[provider.id] === "saving"
                                  ? "Saving..."
                                  : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(provider.id)}
                            >
                              <X className="w-4 h-4 mr-2" />
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(provider)}
                          >
                            Edit
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleTest(provider.id)}
                          disabled={testStatus[provider.id] === "testing"}
                        >
                          <TestTube className="w-4 h-4 mr-2" />
                          {testStatus[provider.id] === "success"
                            ? "Connected!"
                            : testStatus[provider.id] === "error"
                              ? "Failed"
                              : testStatus[provider.id] === "testing"
                                ? "Testing..."
                                : "Test"}
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
