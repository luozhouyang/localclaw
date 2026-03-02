import { useTranslation } from 'react-i18next';
import { ProviderSettings } from '@/components/settings/provider-settings';
import { Settings, Lock } from 'lucide-react';
import { useMasterPasswordContext } from '@/contexts/master-key-context';
import { Button } from '@/components/ui/button';

/**
 * SettingsTab component
 * Settings interface for configuring LLM providers and master key
 */
export function SettingsTab() {
  const { t } = useTranslation();
  const { lock, status } = useMasterPasswordContext();

  return (
    <div className="glass rounded-xl h-[600px] flex flex-col border border-orange-500/20">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-orange-500/20">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-orange-400" />
          <div>
            <h2 className="font-display text-lg font-bold text-white">
              {t('settings.title')}
            </h2>
            <p className="text-xs text-orange-400/70 font-code">
              {t('settings.description')}
            </p>
          </div>
        </div>

        {status.state === 'unlocked' && (
          <Button
            variant="outline"
            size="sm"
            onClick={lock}
            className="border-orange-500/30 hover:bg-orange-500/10 text-orange-400"
          >
            <Lock className="w-4 h-4 mr-2" />
            {t('common.close')}
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <ProviderSettings />
      </div>
    </div>
  );
}
