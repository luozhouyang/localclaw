import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BrowserType } from '@/lib/credential';

interface DegradedModeBannerProps {
  browserType: BrowserType;
  onAcknowledge: () => void;
}

export function DegradedModeBanner({ browserType, onAcknowledge }: DegradedModeBannerProps) {
  const getBrowserName = () => {
    switch (browserType) {
      case 'firefox':
        return 'Firefox';
      case 'safari':
        return 'Safari';
      default:
        return '您的浏览器';
    }
  };

  return (
    <div className="glass rounded-xl p-4 border-amber-500/30 mb-6">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30 flex-shrink-0">
          <AlertTriangle className="w-5 h-5 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-amber-400 font-medium mb-1 flex items-center gap-2">
            ⚠️ 降级方案提示
          </h3>
          <p className="text-stone-400 text-sm mb-2">
            {getBrowserName()} 不支持自动密码保存功能（Credential Management API）。
          </p>
          <p className="text-stone-500 text-xs mb-3">
            为了保护您的 API Key 安全，主密码将仅保存在当前页面内存中，<strong className="text-amber-400">刷新页面后需要重新输入</strong>。
            建议切换到 Chrome 或 Edge 浏览器以获得更好的体验。
          </p>
          <Button
            size="sm"
            onClick={onAcknowledge}
            className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/50 font-code text-xs"
          >
            我知道了
          </Button>
        </div>
      </div>
    </div>
  );
}
