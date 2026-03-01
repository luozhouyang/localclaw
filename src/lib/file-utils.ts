import type { LocalClawFS, LocalClawKV } from '@/infra/fs';

/**
 * Lazy load filesystem (client-side only)
 */
export async function getFS(): Promise<LocalClawFS> {
  const { getFilesystem } = await import('@/infra/fs');
  return getFilesystem();
}

/**
 * Lazy load KV storage (client-side only)
 */
export async function getKV(): Promise<LocalClawKV> {
  const { getKV } = await import('@/infra/fs');
  return getKV();
}
