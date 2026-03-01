import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getBrowserType,
  isPasswordCredentialSupported,
  isDegradedMode,
  saveMasterPassword,
  getMasterPassword,
  hasAcknowledgedDegradedMode,
  acknowledgeDegradedMode,
  type BrowserType,
} from '@/lib/credential';
import {
  setSessionMasterPassword,
  getSessionMasterPassword,
  hasSessionMasterPassword,
} from '@/lib/crypto';

interface UseMasterKeyState {
  // State
  masterKey: string | null;
  isLoading: boolean;
  isLocked: boolean;
  isDegradedMode: boolean;
  browserType: BrowserType;
  hasAcknowledged: boolean;

  // Actions
  init: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
  setupMasterKey: (password: string, saveToBrowser: boolean) => Promise<void>;
  hasMasterKey: () => boolean;
  acknowledgeWarning: () => void;
}

export function useMasterKey(): UseMasterKeyState {
  const [masterKey, setMasterKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(true);
  const [isDegradedModeState, setIsDegradedModeState] = useState(false);
  const [browserType, setBrowserType] = useState<BrowserType>('unknown');
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  // Use ref to prevent infinite loops in init
  const initialized = useRef(false);

  // Initialize: detect browser and try to auto-unlock
  const init = useCallback(async () => {
    if (initialized.current) return;
    initialized.current = true;

    setIsLoading(true);

    try {
      // Detect browser
      const detectedBrowser = getBrowserType();
      setBrowserType(detectedBrowser);

      // Check if degraded mode (Firefox/Safari)
      const degraded = isDegradedMode();
      setIsDegradedModeState(degraded);

      // Check if user acknowledged degraded mode
      setHasAcknowledged(hasAcknowledgedDegradedMode());

      // Check session first (already in memory)
      const sessionPassword = getSessionMasterPassword();
      if (sessionPassword) {
        setMasterKey(sessionPassword);
        setIsLocked(false);
        setIsLoading(false);
        return;
      }

      // If not degraded mode, try to get from Credential API
      if (!degraded) {
        const savedPassword = await getMasterPassword();
        if (savedPassword) {
          setMasterKey(savedPassword);
          setSessionMasterPassword(savedPassword);
          setIsLocked(false);
        }
      }

      // Otherwise, stay locked (need user input)
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    init();
  }, [init]);

  // Unlock with password
  const unlock = useCallback(async (password: string): Promise<boolean> => {
    if (!password || password.length < 8) {
      return false;
    }

    // Store in session
    setSessionMasterPassword(password);
    setMasterKey(password);
    setIsLocked(false);

    return true;
  }, []);

  // Lock (clear from memory)
  const lock = useCallback(() => {
    setSessionMasterPassword(null);
    setMasterKey(null);
    setIsLocked(true);
  }, []);

  // Setup master key (first time)
  const setupMasterKey = useCallback(
    async (password: string, saveToBrowser: boolean): Promise<void> => {
      if (!password || password.length < 8) {
        throw new Error('Password must be at least 8 characters');
      }

      // Always store in session
      setSessionMasterPassword(password);
      setMasterKey(password);
      setIsLocked(false);

      // Try to save to browser's password manager (only works in Chrome/Edge)
      if (saveToBrowser && !isDegradedModeState) {
        await saveMasterPassword(password);
      }
    },
    [isDegradedModeState]
  );

  // Check if we have a master key (in session or Credential API)
  const hasMasterKey = useCallback((): boolean => {
    return hasSessionMasterPassword() || masterKey !== null;
  }, [masterKey]);

  // Acknowledge degraded mode warning
  const acknowledgeWarning = useCallback(() => {
    acknowledgeDegradedMode();
    setHasAcknowledged(true);
  }, []);

  return {
    // State
    masterKey,
    isLoading,
    isLocked,
    isDegradedMode: isDegradedModeState,
    browserType,
    hasAcknowledged,

    // Actions
    init,
    unlock,
    lock,
    setupMasterKey,
    hasMasterKey,
    acknowledgeWarning,
  };
}
