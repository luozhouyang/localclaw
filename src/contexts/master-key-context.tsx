import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { decryptWithPassword } from '@/lib/crypto'
import { providerConfigs } from '@/config/provider'
import { getKV } from '@/infra/fs'

export const CREDENTIAL_ID = 'localclaw-master-password'

// TypeScript type declarations for Credential Management API
declare global {
  interface PasswordCredentialData {
    id: string
    password: string
    name?: string
    iconURL?: string
  }

  interface PasswordCredential extends Credential {
    readonly type: 'password'
    readonly id: string
    readonly password: string
  }

  interface CredentialRequestOptions {
    password?: boolean
  }

  var PasswordCredential: {
    prototype: PasswordCredential
    new (data: PasswordCredentialData): PasswordCredential
  }
}

export type MasterKeyStatus =
  | { state: 'checking' }
  | { state: 'not_set' }
  | { state: 'locked'; hasProviderConfig: boolean; lastError?: string }
  | { state: 'unlocked'; password: string }

// For backward compatibility
export type MasterKeyState = MasterKeyStatus

interface MasterKeyContextValue {
  status: MasterKeyStatus
  isLoading: boolean
  error: string | null
  // 设置 master key（首次使用）
  setMasterKey: (password: string, confirmPassword: string) => Promise<boolean>
  // 解锁
  unlock: (password: string, saveToBrowser?: boolean) => Promise<boolean>
  // 锁定
  lock: () => void
  // 清除所有数据（重置）
  reset: () => Promise<void>
  // 当前解锁的密码（仅在 unlocked 状态有效）
  currentPassword: string | null
}

const MasterKeyContext = createContext<MasterKeyContextValue | null>(null)

// Credential Management API helpers
async function saveToCredential(password: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !('credentials' in navigator)) {
    return false
  }
  try {
    const credential = new PasswordCredential({ id: CREDENTIAL_ID, password })
    await navigator.credentials.store(credential)
    return true
  } catch {
    return false
  }
}

async function getFromCredential(): Promise<{ password: string | null; error?: string }> {
  if (typeof navigator === 'undefined') {
    return { password: null, error: 'Navigator not available' }
  }

  if (!('credentials' in navigator)) {
    return { password: null, error: 'Credential Management API not supported' }
  }

  // Check if running in secure context (required for Credential API)
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return { password: null, error: 'Not in secure context (requires HTTPS or localhost)' }
  }

  try {
    // First try with silent mediation (no user interaction)
    const credential = await navigator.credentials.get({
      password: true,
      mediation: 'silent' as CredentialMediationRequirement,
    })

    if (credential?.type === 'password') {
      const pwd = credential as PasswordCredential
      if (pwd.id === CREDENTIAL_ID && pwd.password) {
        return { password: pwd.password }
      }
    }

    // Silent failed, try with optional mediation (may show UI if needed)
    const credential2 = await navigator.credentials.get({
      password: true,
      mediation: 'optional' as CredentialMediationRequirement,
    })

    if (credential2?.type === 'password') {
      const pwd = credential2 as PasswordCredential
      if (pwd.id === CREDENTIAL_ID && pwd.password) {
        return { password: pwd.password }
      }
    }

    return { password: null, error: 'No matching credential found in browser' }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err)
    return { password: null, error: errorMsg }
  }
}

// Session storage for master password (memory only)
let sessionPassword: string | null = null

// Test helper to reset session password
export function __resetSessionPasswordForTest() {
  sessionPassword = null
}

export function MasterKeyProvider({ children }: { children: ReactNode }) {
  const [internalStatus, setInternalStatus] = useState<MasterKeyStatus>({ state: 'checking' })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const initialized = useRef(false)

  // Check initial state on mount
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const checkState = async () => {
      try {
        setIsLoading(true)

        // First check if master key has been initialized (even without provider config)
        const kv = await getKV()
        const masterKeyInitialized = await kv.get('master-key:initialized')

        // Use Promise.race with timeout wrapper - increased timeout for slower connections
        const config = await Promise.race([
          providerConfigs.getProviderConfig(),
          new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout checking provider config')), 10000)
          )
        ])

        // No provider configured at all
        if (!config) {
          // If master key was initialized but no provider config, user needs to configure provider
          if (masterKeyInitialized) {
            // Master key exists but no provider - go to locked state to unlock first
            setInternalStatus({ state: 'locked', hasProviderConfig: false })
          } else {
            // True first-time user
            setInternalStatus({ state: 'not_set' })
          }
          setIsLoading(false)
          return
        }

        // Check if we have encrypted API key
        if (!config.encryptedApiKey || config.encryptedApiKey.trim() === '') {
          // Provider exists but no API key - needs setup
          setInternalStatus({ state: 'not_set' })
          setIsLoading(false)
          return
        }

        // Try session password first (from previous page navigation)
        if (sessionPassword) {
          try {
            await decryptWithPassword(config.encryptedApiKey, sessionPassword)
            setInternalStatus({ state: 'unlocked', password: sessionPassword })
            setIsLoading(false)
            return
          } catch {
            sessionPassword = null
          }
        }

        // Try credential manager auto-unlock
        const { password: credentialPassword, error: credentialError } = await getFromCredential()

        if (credentialPassword) {
          try {
            await decryptWithPassword(config.encryptedApiKey, credentialPassword)
            sessionPassword = credentialPassword
            setInternalStatus({ state: 'unlocked', password: credentialPassword })
            setIsLoading(false)
            return
          } catch {
            // Credential password decryption failed, continue to manual unlock
          }
        }

        // Need manual unlock - only if credential API failed for a reason other than "not available"
        // If credential API is not available (e.g., not in secure context), go directly to manual unlock
        // without showing the error
        const shouldShowCredentialError = credentialError &&
          !credentialError.includes('Credential Management API not supported') &&
          !credentialError.includes('Navigator not available') &&
          !credentialError.includes('Not in secure context')

        setInternalStatus({
          state: 'locked',
          hasProviderConfig: true,
          lastError: shouldShowCredentialError ? credentialError : undefined
        })
        setIsLoading(false)
      } catch (err) {
        // On timeout or other errors, check if config actually exists
        // If config check itself failed, assume no config (first-time user)
        console.error('Error checking master key state:', err)

        // Try to verify if config exists independently
        try {
          const configExists = await providerConfigs.getProviderConfig().then(c => !!c)
          if (configExists) {
            // Config exists but something else failed - go to locked
            setInternalStatus({
              state: 'locked',
              hasProviderConfig: true,
              lastError: err instanceof Error ? err.message : 'Unknown error'
            })
          } else {
            // No config - first-time user
            setInternalStatus({ state: 'not_set' })
          }
        } catch {
          // Double failure - assume no config
          setInternalStatus({ state: 'not_set' })
        }
        setIsLoading(false)
      }
    }

    checkState()
  }, [])

  // Set master key (first time setup)
  const setMasterKey = useCallback(async (password: string, confirmPassword: string): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return false
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      setIsLoading(false)
      return false
    }

    try {
      // Save a marker to KV to indicate master key has been set
      // This prevents the app from thinking it's a first-time user on refresh
      const kv = await getKV()
      await kv.set('master-key:initialized', true)

      // Save to credential manager for auto-unlock next time
      await saveToCredential(password)
      sessionPassword = password

      setInternalStatus({ state: 'unlocked', password })
      setIsLoading(false)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set master key')
      setIsLoading(false)
      return false
    }
  }, [])

  // Unlock with password
  const unlock = useCallback(async (password: string, saveToBrowser = true): Promise<boolean> => {
    setIsLoading(true)
    setError(null)

    try {
      const config = await providerConfigs.getProviderConfig()

      // If no provider config, just save the password and unlock
      // User will need to configure provider after unlocking
      if (!config?.encryptedApiKey) {
        // No provider config - just save password and unlock
        if (saveToBrowser) {
          await saveToCredential(password)
        }
        sessionPassword = password
        setInternalStatus({ state: 'unlocked', password })
        setIsLoading(false)
        return true
      }

      // Validate password by decrypting
      await decryptWithPassword(config.encryptedApiKey, password)

      // Success - save for auto-unlock if requested
      if (saveToBrowser) {
        await saveToCredential(password)
      }
      sessionPassword = password

      setInternalStatus({ state: 'unlocked', password })
      setIsLoading(false)
      return true
    } catch {
      setError('Invalid password')
      setIsLoading(false)
      return false
    }
  }, [])

  // Lock session
  const lock = useCallback(() => {
    sessionPassword = null
    setInternalStatus({ state: 'locked', hasProviderConfig: true })
  }, [])

  // Reset all
  const reset = useCallback(async () => {
    setIsLoading(true)

    try {
      await providerConfigs.deleteProvider()
      sessionPassword = null

      // Clear credential
      if (typeof navigator !== 'undefined' && 'credentials' in navigator) {
        try {
          const cred = await navigator.credentials.get({ password: true, mediation: 'silent' as CredentialMediationRequirement })
          if (cred) {
            const empty = new PasswordCredential({ id: CREDENTIAL_ID, password: '' })
            await navigator.credentials.store(empty)
          }
        } catch {
          // Ignore
        }
      }

      setInternalStatus({ state: 'not_set' })
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const currentPassword = internalStatus.state === 'unlocked' ? internalStatus.password : null

  const value: MasterKeyContextValue = {
    status: internalStatus,
    isLoading,
    error,
    setMasterKey,
    unlock,
    lock,
    reset,
    currentPassword,
  }

  return (
    <MasterKeyContext.Provider value={value}>
      {children}
    </MasterKeyContext.Provider>
  )
}

export function useMasterPasswordContext() {
  const context = useContext(MasterKeyContext)
  if (!context) {
    throw new Error('useMasterPasswordContext must be used within MasterPasswordProvider')
  }
  return context
}
