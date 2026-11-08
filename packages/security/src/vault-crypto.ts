/**
 * @gallery/security - Hardware-Isolated Vault Cryptography Engine
 * AES-256-GCM encryption for zero-leakage photo protection.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export interface EncryptedPayload {
  cipherBuffer: Buffer;
  iv: string;       // Base64
  authTag: string;  // Base64
}

export class VaultCrypto {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly TAG_LENGTH = 16; // 128 bits auth tag

  /**
   * Encrypts a raw photograph buffer using AES-256-GCM.
   */
  public static encrypt(plainBuffer: Buffer, key32Bytes: Buffer): EncryptedPayload {
    if (key32Bytes.length !== 32) {
      throw new Error('Vault encryption requires an exact 256-bit (32 byte) key');
    }

    const iv = randomBytes(this.IV_LENGTH);
    const cipher = createCipheriv(this.ALGORITHM, key32Bytes, iv, {
      authTagLength: this.TAG_LENGTH,
    });

    const cipherBuffer = Buffer.concat([cipher.update(plainBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      cipherBuffer,
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypts an encrypted photograph buffer.
   * Throws an error if the authentication tag fails (tamper detection).
   */
  public static decrypt(
    cipherBuffer: Buffer,
    ivBase64: string,
    authTagBase64: string,
    key32Bytes: Buffer
  ): Buffer {
    if (key32Bytes.length !== 32) {
      throw new Error('Vault decryption requires an exact 256-bit (32 byte) key');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');

    const decipher = createDecipheriv(this.ALGORITHM, key32Bytes, iv, {
      authTagLength: this.TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(cipherBuffer), decipher.final()]);
  }
}

