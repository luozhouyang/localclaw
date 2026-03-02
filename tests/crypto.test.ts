import { describe, it, expect } from 'vitest'
import { encryptWithPassword, decryptWithPassword, generateSaltAndIV } from '@/lib/crypto'

describe('crypto', () => {
  describe('generateSaltAndIV', () => {
    it('should generate salt and iv', () => {
      const result = generateSaltAndIV()
      expect(result.salt).toBeInstanceOf(Uint8Array)
      expect(result.iv).toBeInstanceOf(Uint8Array)
      expect(result.salt.length).toBe(16)
      expect(result.iv.length).toBe(12)
    })

    it('should generate unique values each time', () => {
      const result1 = generateSaltAndIV()
      const result2 = generateSaltAndIV()
      expect(result1.salt).not.toEqual(result2.salt)
      expect(result1.iv).not.toEqual(result2.iv)
    })
  })

  describe('encryptWithPassword and decryptWithPassword', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'hello world'
      const password = 'mysecretpassword'

      const encrypted = await encryptWithPassword(plaintext, password)
      expect(typeof encrypted).toBe('string')
      expect(encrypted).not.toBe(plaintext)

      const decrypted = await decryptWithPassword(encrypted, password)
      expect(decrypted).toBe(plaintext)
    })

    it('should produce different ciphertexts for same plaintext', async () => {
      const plaintext = 'hello world'
      const password = 'mysecretpassword'

      const encrypted1 = await encryptWithPassword(plaintext, password)
      const encrypted2 = await encryptWithPassword(plaintext, password)

      expect(encrypted1).not.toBe(encrypted2)
    })

    it('should fail with wrong password', async () => {
      const plaintext = 'hello world'
      const password = 'correctpassword'
      const wrongPassword = 'wrongpassword'

      const encrypted = await encryptWithPassword(plaintext, password)

      await expect(decryptWithPassword(encrypted, wrongPassword)).rejects.toThrow()
    })

    it('should handle empty string', async () => {
      const plaintext = ''
      const password = 'mysecretpassword'

      const encrypted = await encryptWithPassword(plaintext, password)
      const decrypted = await decryptWithPassword(encrypted, password)

      expect(decrypted).toBe(plaintext)
    })

    it('should handle unicode characters', async () => {
      const plaintext = 'Hello 世界 🌍 émojis'
      const password = '密码123'

      const encrypted = await encryptWithPassword(plaintext, password)
      const decrypted = await decryptWithPassword(encrypted, password)

      expect(decrypted).toBe(plaintext)
    })
  })
})
