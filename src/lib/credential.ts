/**
 * Browser type detection
 */
export type BrowserType = 'chrome' | 'edge' | 'firefox' | 'safari' | 'unknown';

export function getBrowserType(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();

  // Check for Firefox first (Safari detection needs to exclude Chrome)
  if (ua.includes('firefox')) {
    return 'firefox';
  }

  // Safari: has 'safari' but NOT 'chrome' or 'chromium'
  if (ua.includes('safari') && !ua.includes('chrome') && !ua.includes('chromium')) {
    return 'safari';
  }

  // Edge: has 'edg'
  if (ua.includes('chrome') && ua.includes('edg')) {
    return 'edge';
  }

  // Chrome: has 'chrome' but not 'edg'
  if (ua.includes('chrome')) {
    return 'chrome';
  }

  return 'unknown';
}

/**
 * Check if PasswordCredential API is supported
 * Firefox and Safari do NOT support PasswordCredential
 */
export function isPasswordCredentialSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'PasswordCredential' in window &&
    typeof (window as unknown as { PasswordCredential: unknown }).PasswordCredential === 'function' &&
    navigator.credentials !== undefined
  );
}

/**
 * Check if running in degraded mode (Firefox or Safari)
 */
export function isDegradedMode(): boolean {
  return !isPasswordCredentialSupported();
}

/**
 * Save master password to browser's password manager (Credential API)
 * Only works in Chrome/Edge
 */
export async function saveMasterPassword(password: string): Promise<boolean> {
  if (!isPasswordCredentialSupported()) {
    return false;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const CredentialClass = (window as any).PasswordCredential;
    const cred = new CredentialClass({
      id: 'localclaw-master',
      name: 'LocalClaw Master Password',
      password: password,
    });

    await navigator.credentials.store(cred);
    return true;
  } catch (error) {
    console.error('Failed to save master password:', error);
    return false;
  }
}

/**
 * Get master password from browser's password manager
 * Returns null if not found or not supported
 */
export async function getMasterPassword(): Promise<string | null> {
  if (!isPasswordCredentialSupported()) {
    return null;
  }

  try {
    const cred = await navigator.credentials.get({
      password: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    if (cred && 'password' in cred) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (cred as any).password as string;
    }

    return null;
  } catch (error) {
    console.error('Failed to get master password:', error);
    return null;
  }
}

/**
 * Clear saved master password from browser
 */
export async function clearMasterPassword(): Promise<void> {
  // Note: Credential Management API doesn't have a direct "delete" method
  // The user needs to remove it from browser settings
  // This is actually a security feature
}

/**
 * LocalStorage keys for degraded mode
 */
const DEGRADED_MODE_KEY = 'localclaw:degraded-mode-acknowledged';

/**
 * Check if user has acknowledged degraded mode warning
 */
export function hasAcknowledgedDegradedMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(DEGRADED_MODE_KEY) === 'true';
}

/**
 * Mark degraded mode as acknowledged
 */
export function acknowledgeDegradedMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(DEGRADED_MODE_KEY, 'true');
}

/**
 * Reset degraded mode acknowledgment (for testing)
 */
export function resetDegradedModeAcknowledgment(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DEGRADED_MODE_KEY);
}
