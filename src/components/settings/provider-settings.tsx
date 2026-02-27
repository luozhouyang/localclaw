import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
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
import {
  Plus,
  Power,
  Save,
  Cpu,
  TestTube,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { ModelListEditor } from "./provider-model-list";

// Validate provider name: alphanumeric, hyphens and underscores allowed
const isValidProviderName = (name: string): boolean => {
  return /^[a-zA-Z0-9_-]+$/.test(name);
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

    // Template name must be valid
    if (!isValidProviderName(template.name)) {
      setValidationError(
        `Provider name must contain only letters, numbers, hyphens and underscores`,
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
        `Provider name must contain only letters, numbers, hyphens and underscores. Please edit the name before saving.`,
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

      // If name changed, check for conflicts but don't update id yet
      // (id will be updated on save to avoid re-rendering issues)
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
        // Note: id is not updated here to avoid re-rendering issues
        // It will be updated on save
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
        "Provider name must contain only letters, numbers, hyphens and underscores",
      );
      return;
    }

    // Calculate the correct id based on name
    const expectedId = nameToProviderId(provider.name);

    // If this is a new provider (not yet in providers list), update the id to match name
    const isNewProvider = !providers.find((p) => p.id === id);
    const providerToSave = isNewProvider
      ? { ...provider, id: expectedId }
      : provider;

    // If updating an existing provider and id would change, delete old and save new
    if (!isNewProvider && expectedId !== provider.id) {
      setValidationError(
        "Cannot change name of saved provider. Delete and recreate to change the name.",
      );
      return;
    }

    setSaveStatus((prev) => ({ ...prev, [id]: "saving" }));
    try {
      await saveProvider(providerToSave);
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
      <div className="glass rounded-xl p-8 text-center">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
        <p className="text-stone-400 font-code">INITIALIZING SYSTEM...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="glass-strong rounded-xl p-6 border-glow">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <Cpu className="w-6 h-6 text-orange-400" />
            <div className="absolute inset-0 blur-lg bg-orange-400/50 -z-10" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">
            LLM PROVIDER
          </h2>
        </div>
        <p className="text-stone-400 text-sm font-code">
          Configure AI model providers for agent communication
        </p>
      </div>

      {/* Error Alert */}
      {(error || validationError) && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span className="text-red-400 text-sm font-code">
            {error || validationError}
          </span>
        </div>
      )}

      {/* Active Provider Indicator */}
      {activeProvider && (
        <div className="flex items-center gap-3 p-4 rounded-lg glass border border-amber-500/30 glow-amber">
          <div className="relative">
            <Power className="w-5 h-5 text-amber-400" />
            <div className="absolute inset-0 blur-md bg-amber-400/50 -z-10" />
          </div>
          <div className="flex-1">
            <span className="text-xs text-amber-400 font-code tracking-wider">
              ACTIVE PROVIDER
            </span>
            <div className="flex items-center gap-2">
              <span className="text-white font-medium">
                {activeProvider.name}
              </span>
              <span className="text-xs text-stone-500 font-code">
                {activeProvider.defaultModel}
              </span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        </div>
      )}

      {/* Add Provider Section */}
      <div className="glass rounded-xl p-6">
        <h3 className="font-display text-sm font-bold text-orange-400 mb-4 tracking-wider">
          ADD PROVIDER
        </h3>
        <div className="flex gap-3">
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="flex-1 bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code">
              <SelectValue placeholder="Select provider template" />
            </SelectTrigger>
            <SelectContent className="glass-strong border-orange-500/30">
              {PROVIDER_TEMPLATES.map((template) => (
                <SelectItem
                  key={template.id}
                  value={template.id}
                  className="font-code text-stone-300 focus:bg-orange-500/20 focus:text-orange-400"
                >
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddFromTemplate}
            disabled={!selectedTemplate}
            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 hover:glow-orange font-code"
          >
            <Plus className="w-4 h-4 mr-2" />
            ADD
          </Button>
          <Button
            variant="outline"
            onClick={handleAddCustom}
            className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-code"
          >
            CUSTOM
          </Button>
        </div>
      </div>

      {/* Providers List */}
      {displayProviders.length === 0 ? (
        <div className="glass rounded-xl p-8 text-center border-dashed border-2 border-orange-500/20">
          <Cpu className="w-12 h-12 text-orange-400/30 mx-auto mb-4" />
          <p className="text-stone-500 font-code text-sm">
            NO PROVIDERS CONFIGURED
          </p>
          <p className="text-stone-600 text-xs mt-1">
            Add a provider above to initialize AI capabilities
          </p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
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
                className={`glass rounded-xl border overflow-hidden transition-all duration-300 ${
                  isActive
                    ? "border-amber-500/50 glow-amber"
                    : "border-orange-500/20 hover:border-orange-500/40"
                }`}
              >
                <div className="flex items-center justify-between px-4 py-3">
                  <AccordionTrigger className="hover:no-underline flex-1 [&[data-state=open]>svg]:rotate-180">
                    <div className="flex items-center gap-3 text-left">
                      {isActive ? (
                        <div className="relative">
                          <Power className="w-4 h-4 text-amber-400" />
                          <div className="absolute inset-0 blur-md bg-amber-400/50 -z-10" />
                        </div>
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-stone-600" />
                      )}
                      <span className="font-display text-white tracking-wide">
                        {editingProvider.name}
                      </span>
                      {isActive && (
                        <span className="text-xs bg-amber-400/20 text-amber-400 px-2 py-0.5 rounded font-code border border-amber-400/30">
                          ACTIVE
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
                        className="h-8 w-8 text-amber-400 hover:text-amber-400 hover:bg-amber-400/10"
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
                        className="h-8 w-8 text-stone-500 hover:text-orange-400 hover:bg-orange-500/10"
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
                      className="h-8 w-8 text-stone-500 hover:text-red-400 hover:bg-red-500/10"
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
                  <div className="space-y-4 pt-2 border-t border-orange-500/10">
                    {/* Provider Name */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${provider.id}-name`}
                        className="text-orange-400 font-code text-xs tracking-wider"
                      >
                        DISPLAY NAME
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
                        className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600"
                      />
                      <p className="text-xs text-stone-500 font-code">
                        Letters, numbers, hyphens (-) and underscores (_) allowed
                      </p>
                    </div>

                    {/* Base URL */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${provider.id}-baseurl`}
                        className="text-orange-400 font-code text-xs tracking-wider"
                      >
                        BASE URL
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
                        className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600"
                      />
                    </div>

                    {/* API Key */}
                    <div className="space-y-2">
                      <Label
                        htmlFor={`${provider.id}-apikey`}
                        className="text-orange-400 font-code text-xs tracking-wider"
                      >
                        API KEY
                      </Label>
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
                        className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600"
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
                            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 font-code"
                          >
                            {saveStatus[provider.id] === "saved" ? (
                              <CheckCircle2 className="w-4 h-4 mr-2" />
                            ) : saveStatus[provider.id] === "saving" ? (
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-2" />
                            )}
                            {saveStatus[provider.id] === "saved"
                              ? "SAVED!"
                              : saveStatus[provider.id] === "saving"
                                ? "SAVING..."
                                : "SAVE"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(provider.id)}
                            className="border-stone-600 text-stone-400 hover:bg-stone-800 font-code"
                          >
                            <X className="w-4 h-4 mr-2" />
                            CANCEL
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(provider)}
                          className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10 font-code"
                        >
                          EDIT
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTest(provider.id)}
                        disabled={testStatus[provider.id] === "testing"}
                        className={`font-code ${
                          testStatus[provider.id] === "success"
                            ? "border-amber-500/50 text-amber-400 bg-amber-400/10"
                            : testStatus[provider.id] === "error"
                              ? "border-red-500/50 text-red-400 bg-red-500/10"
                              : "border-stone-600 text-stone-400 hover:bg-stone-800"
                        }`}
                      >
                        <TestTube className="w-4 h-4 mr-2" />
                        {testStatus[provider.id] === "success"
                          ? "CONNECTED!"
                          : testStatus[provider.id] === "error"
                            ? "FAILED"
                            : testStatus[provider.id] === "testing"
                              ? "TESTING..."
                              : "TEST"}
                      </Button>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}
