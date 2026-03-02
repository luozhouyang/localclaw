import { useTranslation } from 'react-i18next';
import { Code2, Hammer } from 'lucide-react';

/**
 * ComingSoonTab component
 * Placeholder for features under development
 */
export function ComingSoonTab() {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-center h-[600px]">
      <div className="text-center space-y-6">
        <div className="relative inline-flex items-center justify-center">
          <div className="absolute inset-0 blur-2xl bg-orange-500/20 rounded-full" />
          <div className="relative p-8 rounded-2xl glass border border-orange-500/30">
            <Code2 className="w-16 h-16 text-orange-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white font-display">
            {t('common.comingSoon', 'Coming Soon')}
          </h2>
          <p className="text-orange-400/70 max-w-sm mx-auto">
            {t('common.underDevelopment', 'This feature is currently under development. Stay tuned for updates!')}
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-sm text-orange-500/60">
          <Hammer className="w-4 h-4" />
          <span className="font-code">{t('common.workInProgress')}</span>
        </div>
      </div>
    </div>
  );
}
