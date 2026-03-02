import { useState, useEffect } from 'react';
import { Lock, Key, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useMasterPasswordContext } from '@/contexts/master-key-context';
import { providerConfigs } from '@/config/provider';

interface MasterKeyGuardProps {
  children: React.ReactNode;
}

/**
 * MasterKeyGuard - 统一处理 Dashboard 的 Master Key 流程
 *
 * 状态处理：
 * 1. checking - 加载中
 * 2. not_set - 首次使用，需要设置 master key 和 provider
 * 3. locked - 需要解锁
 * 4. unlocked - 正常使用
 */
export function MasterKeyGuard({ children }: MasterKeyGuardProps) {
  const { status, isLoading, error, setMasterKey, unlock } = useMasterPasswordContext();

  // Get auto-unlock error if locked
  const autoUnlockError = status.state === 'locked' ? status.lastError : null;

  // Setup state (for not_set status)
  const [step, setStep] = useState<'welcome' | 'set_key' | 'configure_provider'>('welcome');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupError, setSetupError] = useState<string | null>(null);
  const [isSettingUp, setIsSettingUp] = useState(false);

  // Unlock state (for locked status)
  const [unlockPassword, setUnlockPassword] = useState('');
  const [unlockError, setUnlockError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Clear errors when status changes
  useEffect(() => {
    setSetupError(null);
    setUnlockError(null);
  }, [status]);

  // Handle setup submit
  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsSettingUp(true);
    setSetupError(null);

    const success = await setMasterKey(password.trim(), confirmPassword.trim());

    if (success) {
      // Check if provider needs configuration
      const config = await providerConfigs.getProviderConfig();
      if (!config) {
        setStep('configure_provider');
      }
    }

    setIsSettingUp(false);
  };

  // Remember me state
  const [rememberMe, setRememberMe] = useState(true);

  // Handle unlock submit
  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unlockPassword.trim()) return;

    setIsUnlocking(true);
    setUnlockError(null);

    const success = await unlock(unlockPassword.trim(), rememberMe);

    if (!success) {
      setUnlockError('Invalid master password');
    }

    setIsUnlocking(false);
  };

  // Loading state
  if (isLoading || status.state === 'checking') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-orange-400 animate-spin" />
          <p className="text-stone-400 font-code text-sm">Checking...</p>
        </div>
      </div>
    );
  }

  // Not set - First time setup
  if (status.state === 'not_set') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          {step === 'welcome' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto">
                <Key className="w-10 h-10 text-orange-400" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white mb-2">Welcome to LocalClaw</h1>
                <p className="text-stone-400 text-sm">
                  To get started, you need to set up a master password to protect your API keys.
                </p>
              </div>
              <Button
                onClick={() => setStep('set_key')}
                className="bg-orange-500 hover:bg-orange-400 text-white px-8"
              >
                Get Started
              </Button>
            </div>
          )}

          {step === 'set_key' && (
            <div className="bg-stone-900/50 border border-orange-500/20 rounded-lg p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Lock className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="font-medium text-white">Set Master Password</h2>
                  <p className="text-xs text-stone-400">This will be used to encrypt your API keys</p>
                </div>
              </div>

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="text-xs text-stone-400 mb-1 block">Master Password</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password (min 8 characters)"
                    disabled={isSettingUp}
                    className="bg-stone-950 border-orange-500/30 focus:border-orange-400 text-white placeholder:text-stone-600"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-xs text-stone-400 mb-1 block">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    disabled={isSettingUp}
                    className="bg-stone-950 border-orange-500/30 focus:border-orange-400 text-white placeholder:text-stone-600"
                  />
                </div>

                {(error || setupError) && (
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    <span>{error || setupError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep('welcome')}
                    disabled={isSettingUp}
                    className="flex-1 border-stone-600 text-stone-300 hover:bg-stone-800"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSettingUp || !password.trim() || !confirmPassword.trim()}
                    className="flex-1 bg-orange-500 hover:bg-orange-400 text-white"
                  >
                    {isSettingUp ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {step === 'configure_provider' && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                <Lock className="w-10 h-10 text-green-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white mb-2">Master Password Set!</h2>
                <p className="text-stone-400 text-sm mb-4">
                  Your master password has been saved. Now let's configure your LLM provider.
                </p>
              </div>
              <Button
                onClick={() => window.location.href = '/settings/config'}
                className="bg-orange-500 hover:bg-orange-400 text-white px-8"
              >
                Configure Provider
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Locked - Need to unlock
  if (status.state === 'locked') {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-stone-900/50 border border-orange-500/20 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-amber-400/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="font-medium text-white">Unlock LocalClaw</h2>
              <p className="text-xs text-stone-400">Enter your master password to continue</p>
            </div>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <Input
              type="password"
              value={unlockPassword}
              onChange={(e) => setUnlockPassword(e.target.value)}
              placeholder="Master password"
              disabled={isUnlocking}
              className="bg-stone-950 border-orange-500/30 focus:border-orange-400 text-white placeholder:text-stone-600"
              autoFocus
            />

            <label className="flex items-center gap-2 text-sm text-stone-400 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-stone-600 bg-stone-800 text-orange-500 focus:ring-orange-500"
              />
              Remember me (save password to browser)
            </label>

            {autoUnlockError && (
              <div className="flex items-center gap-2 text-amber-400/80 text-xs bg-amber-400/10 p-2 rounded">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                <span>Auto-unlock failed: {autoUnlockError}</span>
              </div>
            )}

            {(error || unlockError) && (
              <div className="flex items-center gap-2 text-red-400 text-sm">
                <AlertCircle className="w-4 h-4" />
                <span>{error || unlockError}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isUnlocking || !unlockPassword.trim()}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white"
            >
              {isUnlocking ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Unlock
            </Button>
          </form>

          <p className="text-xs text-stone-500 mt-4 text-center">
            Your password is stored securely in the browser and will unlock automatically next time.
          </p>
        </div>
      </div>
    );
  }

  // Unlocked - Show children
  return <>{children}</>;
}
