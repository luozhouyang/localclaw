import { Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/**
 * Simple loading screen shown while dashboard initializes
 * Displays animated spinner with loading message
 */
export function LoadingProgress() {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 text-center">
        <div className="relative inline-block">
          <Loader2 className="w-12 h-12 text-orange-500 animate-spin" />
          <div className="absolute inset-0 blur-xl bg-orange-500/50 -z-10" />
        </div>
        <h2 className="text-xl font-bold text-white">
          {t('loading.title')}
        </h2>
        <p className="text-sm text-stone-500">
          {t('loading.message')}
        </p>
      </div>
    </div>
  )
}
