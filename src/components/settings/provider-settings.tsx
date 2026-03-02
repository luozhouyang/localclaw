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
import { useMasterPasswordContext } from "@/contexts/master-key-context";
import { encryptWithPassword, decryptWithPassword } from "@/lib/crypto";
import { providerConfigs } from "@/config/provider";
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
import { useTranslation } from "react-i18next";

interface StoredProvider {
  id: ProviderType;
  name: string;
  baseURL: string;
  apiKey: string;
  models: string[];
  defaultModel: string;
  isActive: boolean;
}

/**
 * ProviderSettings component
 * LLM provider configuration interface with encryption support
 */
export function ProviderSettings() {
  const { t } = useTranslation();
  const { status: mpStatus, currentPassword } = useMasterPasswordContext();

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

  // Load provider config on mount
  const loadProvider = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const config = await providerConfigs.getProviderConfig();
      if (config) {
        // If we have master key, decrypt the API key
        let decryptedApiKey = '';
        if (currentPassword && config.encryptedApiKey) {
          try {
            decryptedApiKey = await decryptWithPassword(config.encryptedApiKey, currentPassword);
          } catch {
            console.warn('Failed to decrypt API key');
          }
        }

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
  }, [currentPassword]);

  // Load provider when master password changes or on mount
  useEffect(() => {
    loadProvider();
  }, [loadProvider]);

  const handleSave = async () => {
    setValidationError(null);

    // Validation
    if (providerType === 'custom' && !baseURL.trim()) {
      setValidationError(t('settings.validations.baseUrlRequired'));
      return;
    }

    if (models.length === 0) {
      setValidationError(t('settings.validations.addModel'));
      return;
    }

    if (!model) {
      setValidationError(t('settings.validations.selectModel'));
      return;
    }

    const invalidModels = models.filter(m => !m.id || m.id.trim() === '');
    if (invalidModels.length > 0) {
      setValidationError(t('settings.validations.invalidModel'));
      return;
    }

    const hasExistingKey = provider !== null;
    const isApiKeyEmpty = apiKeyInput === '' || apiKeyInput === '********************';

    if (!hasExistingKey && isApiKeyEmpty) {
      setValidationError(t('settings.validations.apiKeyRequired'));
      return;
    }

    // Check if we have master key
    if (mpStatus.state !== 'unlocked' || !currentPassword) {
      setValidationError(t('settings.validations.unlockRequired'));
      return;
    }

    // Proceed with save
    await performSave();
  };

  const performSave = async () => {
    setIsSaving(true);
    setValidationError(null);

    try {
      if (!currentPassword) {
        throw new Error('Master key not available');
      }

      // Determine API key to save
      let apiKeyToSave: string;
      if (apiKeyInput && apiKeyInput !== '********************') {
        apiKeyToSave = apiKeyInput;
      } else if (provider?.apiKey) {
        apiKeyToSave = provider.apiKey;
      } else {
        throw new Error('API Key is required');
      }

      // Encrypt API key
      const encryptedApiKey = await encryptWithPassword(apiKeyToSave, currentPassword);

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
    } catch (err) {
      setValidationError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
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

    if (!trimmedInput) {
      setValidationError('Model ID cannot be empty');
      return;
    }

    if (/^\s*$/.test(trimmedInput)) {
      setValidationError('Model ID cannot contain only whitespace');
      return;
    }

    const newModel = {
      id: trimmedInput,
      name: trimmedInput,
    };

    if (models.some(m => m.id === newModel.id)) {
      setValidationError('Model already exists');
      return;
    }

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

  const isLocked = mpStatus.state === 'locked';

  // Show loading state
  if (isLoading || mpStatus.state === 'checking') {
    return (
      <div className="glass rounded-xl p-8 text-center">
        <Loader2 className="w-8 h-8 text-orange-400 animate-spin mx-auto mb-4" />
        <p className="text-stone-400 font-code">{t('common.initializing')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="glass-strong rounded-xl p-6 border-glow">
        <div className="flex items-center gap-3 mb-2">
          <div className="relative">
            <Cpu className="w-6 h-6 text-orange-400" />
            <div className="absolute inset-0 blur-lg bg-orange-400/50 -z-10" />
          </div>
          <h2 className="font-display text-xl font-bold text-white">
            {t('settings.title')}
          </h2>
        </div>
        <p className="text-stone-400 text-sm font-code">
          {t('settings.description')}
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
              {t('settings.activeProvider')}
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
              {t('settings.locked')}
            </p>
          </div>
        </div>
      )}

      {/* Provider Configuration Form */}
      <div className="glass rounded-xl p-6 space-y-6">
        {/* Provider Type */}
        <div className="space-y-2">
          <Label className="text-orange-400 font-code text-xs tracking-wider">
            {t('settings.providerType.label')}
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
                {t('settings.providerType.openrouter')}
              </SelectItem>
              <SelectItem
                value="custom"
                className="font-code text-stone-300 focus:bg-orange-500/20 focus:text-orange-400"
              >
                {t('settings.providerType.custom')}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label className="text-orange-400 font-code text-xs tracking-wider">
            {t('settings.apiKey.label')}
          </Label>
          <Input
            type="password"
            value={apiKeyInput}
            onChange={(e) => setApiKeyInput(e.target.value)}
            placeholder={provider?.apiKey ? '********************' : (providerType === 'openrouter' ? t('settings.apiKey.placeholder.openrouter') : t('settings.apiKey.placeholder.custom'))}
            className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600"
          />
          {provider?.apiKey && !apiKeyInput && (
            <p className="text-xs text-stone-500 font-code">{t('settings.apiKey.saved')}</p>
          )}
        </div>

        {/* Custom Provider Fields */}
        {providerType === 'custom' && (
          <div className="space-y-2">
            <Label className="text-orange-400 font-code text-xs tracking-wider flex items-center gap-2">
              <Globe className="w-3 h-3" />
              {t('settings.baseUrl.label')}
            </Label>
            <Input
              value={baseURL}
              onChange={(e) => setBaseURL(e.target.value)}
              placeholder={t('settings.baseUrl.placeholder')}
              className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white placeholder:text-stone-600"
            />
            <p className="text-xs text-stone-500 font-code">
              {t('settings.baseUrl.description')}
            </p>
          </div>
        )}

        {/* Models */}
        <div className="space-y-4">
          <Label className="text-orange-400 font-code text-xs tracking-wider">
            {t('settings.models.label')}
          </Label>

          <Select value={model || undefined} onValueChange={setModel}>
            <SelectTrigger className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code">
              <SelectValue placeholder={t('settings.models.placeholder')} />
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

          <div className="flex gap-2">
            <Input
              value={newModelInput}
              onChange={(e) => setNewModelInput(e.target.value)}
              placeholder={providerType === 'openrouter' ? t('settings.models.addPlaceholder.openrouter') : t('settings.models.addPlaceholder.custom')}
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

          {models.length > 0 && (
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
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t border-orange-500/20">
          <Button
            onClick={handleSave}
            disabled={isSaving || mpStatus.state !== 'unlocked'}
            className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50 font-code"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isSaving ? t('settings.actions.saving') : t('settings.actions.save')}
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
              t('settings.actions.test')
            )}
          </Button>

          {provider && (
            <Button
              variant="outline"
              onClick={handleDelete}
              className="border-red-500/30 text-red-400 hover:bg-red-500/10 font-code ml-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {t('settings.actions.delete')}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
