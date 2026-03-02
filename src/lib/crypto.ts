const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const ITERATIONS = 100000;

// Session cache for decrypted keys (cleared on page reload)
const sessionKeyCache = new Map<string, string>();
// Session master password (stored in memory only, never persisted)
let sessionMasterPassword: string | null = null;

/**
 * Derive encryption key from master password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordData = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordData,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: ITERATIONS,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random salt and IV
 */
export function generateSaltAndIV(): { salt: Uint8Array; iv: Uint8Array } {
  return {
    salt: crypto.getRandomValues(new Uint8Array(SALT_LENGTH)),
    iv: crypto.getRandomValues(new Uint8Array(IV_LENGTH)),
  };
}

/**
 * Encrypt data with master password
 * Returns base64 encoded string: salt + iv + ciphertext
 */
export async function encryptWithPassword(
  plaintext: string,
  password: string
): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plaintext);

  // Generate random salt and IV
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  // Derive key and encrypt
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  // Combine salt + iv + ciphertext
  const result = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  result.set(salt, 0);
  result.set(iv, salt.length);
  result.set(new Uint8Array(ciphertext), salt.length + iv.length);

  // Convert to base64 for storage
  return btoa(String.fromCharCode(...result));
}

/**
 * Decrypt data with master password
 */
export async function decryptWithPassword(
  ciphertext: string,
  password: string
): Promise<string> {
  try {
    // Decode base64
    const data = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));

    // Extract salt, iv, and ciphertext
    const salt = data.slice(0, SALT_LENGTH);
    const iv = data.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = data.slice(SALT_LENGTH + IV_LENGTH);

    // Derive key and decrypt
    const key = await deriveKey(password, salt);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encrypted
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch {
    throw new Error('Invalid password or corrupted data');
  }
}

/**
 * Session management for master password
 * Master password is ONLY stored in memory, never persisted to storage
 */
export function setSessionMasterPassword(password: string | null): void {
  sessionMasterPassword = password;
}

export function getSessionMasterPassword(): string | null {
  return sessionMasterPassword;
}

export function hasSessionMasterPassword(): boolean {
  return sessionMasterPassword !== null;
}

/**
 * Cache decrypted value in session
 */
export function cacheDecryptedValue(key: string, value: string): void {
  sessionKeyCache.set(key, value);
}

export function getCachedDecryptedValue(key: string): string | undefined {
  return sessionKeyCache.get(key);
}

export function clearSessionCache(): void {
  sessionKeyCache.clear();
  sessionMasterPassword = null;
}
