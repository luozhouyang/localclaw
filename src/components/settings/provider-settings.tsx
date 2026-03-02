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
import { OPENROUTER_CONFIG, type ProviderType } from "@/types/llm";
import { useMasterKey } from "@/hooks/use-master-key";
import { encryptWithPassword, decryptWithPassword } from "@/lib/crypto";
import { providerConfigs } from "@/config/provider";
import { MasterPasswordDialog } from "@/components/masterkey/MasterPasswordDialog";
import { ApiKeyInput } from "@/components/masterkey/ApiKeyInput";
import { DegradedModeBanner } from "@/components/masterkey/DegradedModeBanner";
import {
  Save,
  Trash2,
  Power,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  Cpu,
  Plus,
  X,
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";

interface StoredProvider {
  id: ProviderType;
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
  isActive: boolean;
}

export function LLMProviderSettings() {
  // Master key management
  const {
    masterKey,
    isLoading: isMasterKeyLoading,
    isLocked,
    isDegradedMode,
    browserType,
    hasAcknowledged,
    unlock,
    setupMasterKey,
    hasMasterKey,
    acknowledgeWarning,
  } = useMasterKey();

  // Provider state
  const [provider, setProvider] = useState<StoredProvider | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [providerType, setProviderType] = useState<ProviderType>('openrouter');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [baseURL, setBaseURL] = useState('');
  const [model, setModel] = useState('');
  const [models, setModels] = useState<Array<{ id: string; name: string }>>([]);
  const [newModelInput, setNewModelInput] = useState('');

  // UI state
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showMasterPasswordDialog, setShowMasterPasswordDialog] = useState(false);
  const [masterPasswordMode, setMasterPasswordMode] = useState<'setup' | 'unlock'>('setup');

  // Load provider config on mount
  const loadProvider = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config = await providerConfigs.getProviderConfig();
      if (config) {
        // If we have master key, decrypt the API key
        let decryptedApiKey = '';
        if (masterKey && config.encryptedApiKey) {
          try {
            decryptedApiKey = await decryptWithPassword(config.encryptedApiKey, masterKey);
          } catch {
            // Decryption failed, API key stays empty
            console.warn('Failed to decrypt API key');
          }
        }

        // Filter out empty model IDs
        const loadedModels = (config.models || [config.defaultModel || '']).filter(m => m && m.trim() !== '');
        const loadedDefaultModel = config.defaultModel || (loadedModels[0] || '');

        setProvider({
          id: config.id,
          name: config.id === 'openrouter' ? OPENROUTER_CONFIG.name : 'Custom',
          baseURL: config.baseURL,
          apiKey: decryptedApiKey,
          models: loadedModels,
          defaultModel: loadedDefaultModel,
          isActive: true,
        });

        setProviderType(config.id);
        setBaseURL(config.baseURL);
        setModels(loadedModels.map(m => ({ id: m, name: m })));
        setModel(loadedDefaultModel);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load provider');
    } finally {
      setIsLoading(false);
    }
  }, [masterKey]);

  // Load provider when master key changes or on mount
  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  const handleSave = async () => {
    setValidationError(null);

    // Validation
    if (providerType === 'custom') {
      if (!baseURL.trim()) {
        setValidationError('Base URL is required for custom provider');
        return;
      }
    }

    // Ensure at least one model is added for both provider types
    if (models.length === 0) {
      setValidationError('Please add at least one model');
      return;
    }

    // Ensure a default model is selected
    if (!model) {
      setValidationError('Please select a default model');
      return;
    }

    // Ensure all models have valid non-empty IDs
    const invalidModels = models.filter(m => !m.id || m.id.trim() === '');
    if (invalidModels.length > 0) {
      setValidationError('Invalid model detected. Please remove empty models and try again.');
      return;
    }

    // Check if we need API key
    const hasExistingKey = provider !== null;
    const isApiKeyEmpty = apiKeyInput === '' || apiKeyInput === '********************';

    if (!hasExistingKey && isApiKeyEmpty) {
      setValidationError('API Key is required');
      return;
    }

    // Check if we have master key
    if (!hasMasterKey()) {
      setMasterPasswordMode('setup');
      setShowMasterPasswordDialog(true);
      return;
    }

    if (!masterKey) {
      setMasterPasswordMode('unlock');
      setShowMasterPasswordDialog(true);
      return;
    }

    // Proceed with save
    await performSave();
  };

  const performSave = async (explicitPassword?: string) => {
    setIsSaving(true);
    setValidationError(null);

    try {
      // Use explicit password if provided (from dialog), otherwise use state
      const keyToUse = explicitPassword || masterKey;
      if (!keyToUse) {
        throw new Error('Master key not available');
      }

      // Determine API key to save
      let apiKeyToSave: string;
      if (apiKeyInput && apiKeyInput !== '********************') {
        // User entered new API key
        apiKeyToSave = apiKeyInput;
      } else if (provider?.apiKey) {
        // Use existing decrypted API key
        apiKeyToSave = provider.apiKey;
      } else {
        throw new Error('API Key is required');
      }

      // Encrypt API key
      const encryptedApiKey = await encryptWithPassword(apiKeyToSave, keyToUse);

      // Prepare models array and default model for saving
      const modelsToSave = models.length > 0 ? models.map(m => m.id) : [providerType === 'openrouter' ? OPENROUTER_CONFIG.defaultModel : ''];
      const defaultModelToSave = model || modelsToSave[0];

      // Save config
      const savedConfig = await providerConfigs.saveProviderConfig(
        providerType,
        baseURL,
        modelsToSave,
        defaultModelToSave,
        encryptedApiKey
      );

      // Update local state
      setProvider({
        id: savedConfig.id,
        name: savedConfig.id === 'openrouter' ? OPENROUTER_CONFIG.name : 'Custom',
        baseURL: savedConfig.baseURL,
        apiKey: apiKeyToSave,
        models: savedConfig.models,
        defaultModel: savedConfig.defaultModel,
        isActive: true,
      });

      // Clear input (shows placeholder)
      setApiKeyInput('');

      // Show degraded mode warning if applicable
      if (isDegradedMode) {
        setValidationError('Provider saved. Note: Refresh page will require re-entering master password.');
      }
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleMasterPasswordConfirm = async (password: string, saveToBrowser: boolean) => {
    if (masterPasswordMode === 'setup') {
      try {
        await setupMasterKey(password, saveToBrowser);
      } catch (err) {
        setValidationError(err instanceof Error ? err.message : 'Failed to setup master key');
        return;
      }
      setShowMasterPasswordDialog(false);
      // Proceed with save after setting up master key
      await performSave(password);
    } else {
      // Unlock mode - just unlock, don't try to save
      const success = await unlock(password);
      if (!success) {
        setValidationError('Invalid password');
        return;
      }
      setShowMasterPasswordDialog(false);
      // After unlock, the useEffect will trigger loadProvider to decrypt the API key
    }
  };

  const handleDelete = async () => {
    try {
      await providerConfigs.deleteProvider();
      setProvider(null);
      setProviderType('openrouter');
      setApiKeyInput('');
      setBaseURL('');
      setModel('');
      setModels([]);
    } catch (err) {
      console.error('Failed to delete provider:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete provider');
    }
  };

  // Model management functions
  const handleAddModel = () => {
    const trimmedInput = newModelInput.trim();

    // Validate: prevent empty input
    if (!trimmedInput) {
      setValidationError('Model ID cannot be empty');
      return;
    }

    // Validate: prevent whitespace-only or invalid characters
    if (/^\s*$/.test(trimmedInput)) {
      setValidationError('Model ID cannot contain only whitespace');
      return;
    }

    const newModel = {
      id: trimmedInput,
      name: trimmedInput,
    };

    // Check if model already exists
    if (models.some(m => m.id === newModel.id)) {
      setValidationError('Model already exists');
      return;
    }

    // Filter out any invalid existing models and add new one
    setModels(prev => [...prev.filter(m => m.id && m.id.trim() !== ''), newModel]);
    setNewModelInput('');
    setValidationError(null);

    // Auto select the newly added model
    setModel(newModel.id);
  };

  const handleRemoveModel = (modelId: string) => {
    setModels(prev => prev.filter(m => m.id && m.id.trim() !== '' && m.id !== modelId));
    if (model === modelId) {
      setModel('');
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      const apiKeyToTest = apiKeyInput && apiKeyInput !== '********************'
        ? apiKeyInput
        : provider?.apiKey;

      if (!apiKeyToTest) {
        throw new Error('API Key is required');
      }
      if (providerType === 'custom' && !baseURL) {
        throw new Error('Base URL is required');
      }

      // Simulate API test
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setTestResult('success');
    } catch {
      setTestResult('error');
    } finally {
      setIsTesting(false);
    }
  };

  // Show loading state
  if (isLoading || isMasterKeyLoading) {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
        <p className="text-stone-400 font-code">INITIALIZING...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Degraded Mode Banner (Firefox/Safari) */}
      {isDegradedMode && !hasAcknowledged && (
        <DegradedModeBanner
          browserType={browserType}
          onAcknowledge={acknowledgeWarning}
        />
      )}

      {/* Header */}
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
          Configure OpenRouter or a custom OpenAI-compatible provider
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

      {/* Active Provider Badge */}
      {provider && !isLocked && (
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
              <span className="text-white font-medium">{provider.name}</span>
              <span className="text-xs text-stone-500 font-code">{provider.defaultModel}</span>
            </div>
          </div>
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        </div>
      )}

      {/* Locked Warning */}
      {isLocked && provider && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-amber-400 text-sm font-code">
              Provider is locked. Enter master password to unlock.
            </p>
          </div>
          <Button
            size="sm"
            onClick={() => {
              setMasterPasswordMode('unlock');
              setShowMasterPasswordDialog(true);
            }}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 font-code text-xs"
          >
            Unlock
          </Button>
        </div>
      )}

      {/* Provider Configuration Form */}
      <div className="glass rounded-xl p-6 space-y-6">
        {/* Provider Type */}
        <div className="space-y-2">
          <Label className="text-orange-400 font-code text-xs tracking-wider">
            PROVIDER TYPE
          </Label>
          <Select
            value={providerType}
            onValueChange={(v) => setProviderType(v as ProviderType)}
          >
            <SelectTrigger className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-orange-500/30">
              <SelectItem
                value="openrouter"
                className="font-code text-stone-300 focus:bg-orange-500/20 focus:text-orange-400"
              >
                OpenRouter
              </SelectItem>
              <SelectItem
                value="custom"
                className="font-code text-stone-300 focus:bg-orange-500/20 focus:text-orange-400"
              >
                Custom (OpenAI-compatible)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* API Key with masking */}
        <ApiKeyInput
          value={apiKeyInput}
          hasExistingKey={provider !== null}
          onChange={setApiKeyInput}
          placeholder={providerType === 'openrouter' ? 'sk-or-v1-...' : 'sk-...'}
        />

        {/* Custom Provider Fields */}
        {providerType === 'custom' && (
          <>
            <div className="space-y-2">
              <Label className="text-orange-400 font-code text-xs tracking-wider flex items-center gap-2">
                <Globe className="w-3 h-3" />
                BASE URL
              </Label>
              <Input
                value={baseURL}
                onChange={(e) => setBaseURL(e.target.value)}
                placeholder="https://api.example.com/v1"
                className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600"
              />
              <p className="text-xs text-stone-500 font-code">
                The base URL for your OpenAI-compatible API endpoint
              </p>
            </div>

            {/* Custom Provider Model Management */}
            <div className="space-y-4">
              <Label className="text-orange-400 font-code text-xs tracking-wider">
                MODELS
              </Label>

              {/* Model Selector */}
              <Select value={model || undefined} onValueChange={setModel}>
                <SelectTrigger className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code">
                  <SelectValue placeholder="Select or add a model" />
                </SelectTrigger>
                <SelectContent className="glass-strong border-orange-500/30 max-h-64">
                  {models.filter(m => m.id && m.id.trim() !== '').map((m) => (
                    <SelectItem
                      key={m.id}
                      value={m.id}
                      className="font-code text-stone-300 focus:bg-orange-500/20 focus:text-orange-400"
                    >
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Add New Model */}
              <div className="flex gap-2">
                <Input
                  value={newModelInput}
                  onChange={(e) => setNewModelInput(e.target.value)}
                  placeholder="Add model ID (e.g., gpt-4o, claude-3-sonnet)"
                  className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddModel();
                    }
                  }}
                />
                <Button
                  type="button"
                  onClick={handleAddModel}
                  disabled={!newModelInput.trim()}
                  className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 font-code px-3"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Model List */}
              {models.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-stone-500 font-code">Available models:</p>
                  <div className="flex flex-wrap gap-2">
                    {models.map((m) => (
                      <div
                        key={m.id}
                        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-code ${
                          model === m.id
                            ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                            : 'bg-stone-800/50 text-stone-400 border border-stone-700'
                        }`}
                      >
                        <span>{m.name}</span>
                        <button
                          onClick={() => handleRemoveModel(m.id)}
                          className="hover:text-red-400 ml-1"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-stone-500 font-code">
                Add model IDs to the list. Select one as default. Click X to remove.
              </p>
            </div>
          </>
        )}

        {/* Model Selection */}
        {providerType === 'openrouter' && (
          <div className="space-y-4">
            <Label className="text-orange-400 font-code text-xs tracking-wider">
              MODEL
            </Label>

            {/* Model Selector */}
            <Select value={model || undefined} onValueChange={setModel}>
              <SelectTrigger className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code">
                <SelectValue placeholder={`Select or add a model`} />
              </SelectTrigger>
              <SelectContent className="glass-strong border-orange-500/30 max-h-64">
                {models.filter(m => m.id && m.id.trim() !== '').map((m) => (
                  <SelectItem
                    key={m.id}
                    value={m.id}
                    className="font-code text-stone-300 focus:bg-orange-500/20 focus:text-orange-400"
                  >
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Add New Model */}
            <div className="flex gap-2">
              <Input
                value={newModelInput}
                onChange={(e) => setNewModelInput(e.target.value)}
                placeholder="Add model ID (e.g., anthropic/claude-3.5-sonnet)"
                className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600 text-sm"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddModel();
                  }
                }}
              />
              <Button
                type="button"
                onClick={handleAddModel}
                disabled={!newModelInput.trim()}
                className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 font-code px-3"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {/* Model List */}
            {models.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs text-stone-500 font-code">Available models:</p>
                <div className="flex flex-wrap gap-2">
                  {models.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-code ${
                        model === m.id
                          ? 'bg-orange-500/30 text-orange-400 border border-orange-500/50'
                          : 'bg-stone-800/50 text-stone-400 border border-stone-700'
                      }`}
                    >
                      <span>{m.name}</span>
                      <button
                        onClick={() => handleRemoveModel(m.id)}
                        className="hover:text-red-400 ml-1"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-stone-500 font-code">
              Add model IDs to the list. Select one to use it. Click X to remove.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-orange-500/20">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 font-code"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? 'SAVING...' : 'SAVE'}
          </Button>

          <Button
            variant="outline"
            onClick={handleTest}
            disabled={isTesting}
            className={`font-code ${
              testResult === 'success'
                ? 'border-amber-500/50 text-amber-400 bg-amber-400/10'
                : testResult === 'error'
                  ? 'border-red-500/50 text-red-400 bg-red-500/10'
                  : 'border-stone-600 text-stone-400 hover:bg-stone-800'
            }`}
          >
            {isTesting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : testResult === 'success' ? (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            ) : (
              'TEST'
            )}
          </Button>

          {provider && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-code ml-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              DELETE
            </Button>
          )}
        </div>
      </div>

      {/* Master Password Dialog */}
      <MasterPasswordDialog
        open={showMasterPasswordDialog}
        onOpenChange={setShowMasterPasswordDialog}
        onConfirm={handleMasterPasswordConfirm}
        mode={masterPasswordMode}
        browserType={browserType}
        isDegradedMode={isDegradedMode}
      />
    </div>
  );
}
