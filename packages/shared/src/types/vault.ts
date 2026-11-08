/**
 * @gallery/shared - Secure Vault & Exclusion Models
 */

export interface VaultItem {
  id: string;
  originalFileName: string;
  cipherPayloadPath: string;     // Encrypted file on disk
  iv: string;                    // Base64 96-bit initialization vector
  authTag: string;               // Base64 128-bit authentication tag
  fileSize: number;
  mimeType: string;
  encryptedAt: string;
}

export interface VaultState {
  isLocked: boolean;
  hasVaultKey: boolean;
  autoLockMinutes: number;
  itemCount: number;
}

export interface ExcludedFolder {
  id: string;
  canonicalPath: string;         // Fully resolved canonical path
  inode?: string;                // File system inode identifier
  isRecursive: boolean;
  addedAt: string;
}

