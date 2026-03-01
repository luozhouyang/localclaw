import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import type { BrowserType } from '@/lib/credential';

interface MasterPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (password: string, saveToBrowser: boolean) => void;
  mode: 'setup' | 'unlock';
  browserType: BrowserType;
  isDegradedMode: boolean;
}

export function MasterPasswordDialog({
  open,
  onOpenChange,
  onConfirm,
  mode,
  browserType,
  isDegradedMode,
}: MasterPasswordDialogProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saveToBrowser, setSaveToBrowser] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setPassword('');
      setConfirmPassword('');
      setSaveToBrowser(true);
      setShowPassword(false);
      setError(null);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (mode === 'setup' && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    onConfirm(password, saveToBrowser);
  };

  const getDialogTitle = () => {
    if (mode === 'unlock') {
      return '🔐 Enter Master Password';
    }
    return '🔐 Set Master Password';
  };

  const getBrowserName = () => {
    switch (browserType) {
      case 'firefox':
        return 'Firefox';
      case 'safari':
        return 'Safari';
      case 'chrome':
        return 'Chrome';
      case 'edge':
        return 'Edge';
      default:
        return 'Your browser';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-orange-500/30 max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-amber-500/20 border border-amber-500/30">
              <Shield className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <DialogTitle className="text-white font-display">
                {getDialogTitle()}
              </DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-stone-400 text-sm space-y-2">
            {mode === 'setup' ? (
              <>
                {isDegradedMode ? (
                  // Degraded mode (Firefox/Safari)
                  <>
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                      <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-amber-200 text-sm">
                        <p className="font-medium mb-1">
                          {getBrowserName()} 不支持自动密码保存
                        </p>
                        <p className="text-amber-200/70 text-xs">
                          主密码将仅保存在当前页面内存中。刷新页面后需要重新输入。
                          建议使用 Chrome 或 Edge 浏览器获得更好体验。
                        </p>
                      </div>
                    </div>
                    <p className="mt-3">
                      请设置主密码用于加密您的 API Key：
                    </p>
                  </>
                ) : (
                  // Full support (Chrome/Edge)
                  <>
                    <p>
                      为了保护您的 API Key，需要设置一个主密码。
                      此密码将用于加密您的敏感数据。
                    </p>
                    <div className="p-3 rounded-lg bg-stone-900/50 border border-stone-700/50 text-xs text-stone-500 space-y-1">
                      <p className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        您的密码将保存到浏览器密码管理器
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        API Key 使用 AES-256 加密后存储
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        密码不会发送到任何服务器
                      </p>
                      <p className="flex items-center gap-2">
                        <span className="text-green-400">✓</span>
                        您可以在浏览器设置中管理保存的密码
                      </p>
                    </div>
                  </>
                )}
              </>
            ) : (
              // Unlock mode
              <p>
                {isDegradedMode
                  ? '请输入主密码解锁 API Key。刷新页面后需要重新输入。'
                  : '请输入您的主密码以解密和访问 API Key。'}
              </p>
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="master-password" className="text-orange-400 font-code text-xs">
              {mode === 'setup' ? 'MASTER PASSWORD' : 'PASSWORD'}
            </Label>
            <div className="relative">
              <Input
                id="master-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password (min 8 characters)"
                className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500 hover:text-orange-400"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {mode === 'setup' && (
            <div className="space-y-2">
              <Label htmlFor="confirm-password" className="text-orange-400 font-code text-xs">
                CONFIRM PASSWORD
              </Label>
              <Input
                id="confirm-password"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="bg-stone-900/50 border-orange-500/30 focus:border-orange-400 font-code text-white"
              />
            </div>
          )}

          {/* Save to browser checkbox - only show in setup mode and not degraded mode */}
          {mode === 'setup' && !isDegradedMode && (
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={saveToBrowser}
                onCheckedChange={(checked) => setSaveToBrowser(checked as boolean)}
                className="border-orange-500/30 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
              />
              <Label htmlFor="remember" className="text-sm text-stone-400 cursor-pointer">
                保存到浏览器密码管理器（推荐）
              </Label>
            </div>
          )}

          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-stone-600 text-stone-400 hover:bg-stone-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/50"
            >
              {mode === 'setup' ? 'Set Password & Save' : 'Unlock'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
