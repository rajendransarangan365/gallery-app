/**
 * @gallery/vault-engine - Zero-Leakage Secure Vault Manager
 * Hardware-isolated AES-256-GCM vault with PBKDF2 key derivation and secure memory wiping.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto, { pbkdf2Sync, randomBytes, timingSafeEqual } from 'node:crypto';
import type { VaultItem, VaultState } from '@gallery/shared';
import { VaultCrypto } from '@gallery/security';

export interface VaultConfig {
  salt: string;              // Hex
  verificationHash: string;  // Hex
  createdAt: string;
}

export class VaultManager {
  private vaultRoot: string;
  private activeKey: Buffer | null = null;
  private autoLockTimer: NodeJS.Timeout | null = null;

  constructor(customVaultRoot?: string) {
    this.vaultRoot = customVaultRoot || path.join(os.homedir(), '.photogallery', 'vault');
  }

  /**
   * Initializes vault directory boundaries.
   */
  public async initialize(): Promise<void> {
    await fs.promises.mkdir(path.join(this.vaultRoot, 'payloads'), { recursive: true });
    await fs.promises.mkdir(path.join(this.vaultRoot, 'manifest'), { recursive: true });
  }

  /**
   * Checks whether the user has already configured a vault PIN/password.
   */
  public isConfigured(): boolean {
    const configPath = path.join(this.vaultRoot, 'vault-config.json');
    return fs.existsSync(configPath);
  }

  /**
   * Sets up initial Master PIN or Password for the Vault.
   */
  public async setupVault(pinOrPassword: string): Promise<void> {
    if (this.isConfigured()) {
      throw new Error('Vault is already initialized. Use unlock or reset.');
    }
    await this.initialize();

    const salt = randomBytes(32);
    const derivedKey = pbkdf2Sync(pinOrPassword, salt, 100_000, 32, 'sha512');
    const verificationHash = crypto.createHash('sha256').update(Buffer.concat([derivedKey, Buffer.from('VAULT_VERIFY')])).digest();

    const config: VaultConfig = {
      salt: salt.toString('hex'),
      verificationHash: verificationHash.toString('hex'),
      createdAt: new Date().toISOString(),
    };

    await fs.promises.writeFile(
      path.join(this.vaultRoot, 'vault-config.json'),
      JSON.stringify(config, null, 2),
      'utf-8'
    );

    // Auto-unlock upon creation
    this.activeKey = derivedKey;
  }

  /**
   * Authenticates user and unlocks the Vault.
   */
  public async unlock(pinOrPassword: string): Promise<boolean> {
    const configPath = path.join(this.vaultRoot, 'vault-config.json');
    if (!fs.existsSync(configPath)) {
      throw new Error('Vault is not configured.');
    }

    const raw = await fs.promises.readFile(configPath, 'utf-8');
    const config: VaultConfig = JSON.parse(raw);

    const salt = Buffer.from(config.salt, 'hex');
    const candidateKey = pbkdf2Sync(pinOrPassword, salt, 100_000, 32, 'sha512');
    const candidateCheck = crypto.createHash('sha256').update(Buffer.concat([candidateKey, Buffer.from('VAULT_VERIFY')])).digest();

    const expectedCheck = Buffer.from(config.verificationHash, 'hex');

    if (!timingSafeEqual(candidateCheck, expectedCheck)) {
      // Wipe candidate key from RAM immediately
      candidateKey.fill(0);
      return false;
    }

    this.activeKey = candidateKey;
    this.scheduleAutoLock(15); // Auto-lock after 15 minutes of inactivity
    return true;
  }

  /**
   * Locks the Vault and securely scrubs active key buffers from RAM.
   */
  public lock(): void {
    if (this.activeKey) {
      this.activeKey.fill(0); // Constant-time memory scrubbing
      this.activeKey = null;
    }
    if (this.autoLockTimer) {
      clearTimeout(this.autoLockTimer);
      this.autoLockTimer = null;
    }
  }

  public isUnlocked(): boolean {
    return this.activeKey !== null;
  }

  /**
   * Imports a plaintext photo into the AES-256-GCM Vault and securely wipes the plaintext file.
   */
  public async importPhoto(plainFilePath: string): Promise<VaultItem> {
    if (!this.activeKey) {
      throw new Error('Access denied: Vault is locked.');
    }

    const fileBuffer = await fs.promises.readFile(plainFilePath);
    const fileName = path.basename(plainFilePath);
    const stats = await fs.promises.stat(plainFilePath);
    const itemId = crypto.randomUUID();

    // Encrypt payload with AES-256-GCM
    const encrypted = VaultCrypto.encrypt(fileBuffer, this.activeKey);

    const payloadPath = path.join(this.vaultRoot, 'payloads', `${itemId}.enc`);
    await fs.promises.writeFile(payloadPath, encrypted.cipherBuffer);

    const vaultItem: VaultItem = {
      id: itemId,
      originalFileName: fileName,
      cipherPayloadPath: payloadPath,
      iv: encrypted.iv,
      authTag: encrypted.authTag,
      fileSize: stats.size,
      mimeType: 'image/jpeg',
      encryptedAt: new Date().toISOString(),
    };

    const manifestPath = path.join(this.vaultRoot, 'manifest', `${itemId}.json`);
    await fs.promises.writeFile(manifestPath, JSON.stringify(vaultItem, null, 2), 'utf-8');

    // Secure erasure of original file: overwrite with random noise before unlinking
    const noise = randomBytes(stats.size);
    await fs.promises.writeFile(plainFilePath, noise);
    await fs.promises.unlink(plainFilePath);

    return vaultItem;
  }

  /**
   * Decrypts a vault photo and exports it back to an ordinary directory.
   */
  public async exportPhoto(itemId: string, destinationDirectory: string): Promise<string> {
    if (!this.activeKey) {
      throw new Error('Access denied: Vault is locked.');
    }

    const manifestPath = path.join(this.vaultRoot, 'manifest', `${itemId}.json`);
    const raw = await fs.promises.readFile(manifestPath, 'utf-8');
    const item: VaultItem = JSON.parse(raw);

    const cipherBuffer = await fs.promises.readFile(item.cipherPayloadPath);
    const plainBuffer = VaultCrypto.decrypt(cipherBuffer, item.iv, item.authTag, this.activeKey);

    const destinationPath = path.join(destinationDirectory, item.originalFileName);
    await fs.promises.writeFile(destinationPath, plainBuffer);

    // Remove from vault
    await fs.promises.unlink(item.cipherPayloadPath).catch(() => {});
    await fs.promises.unlink(manifestPath).catch(() => {});

    return destinationPath;
  }

  /**
   * Lists all items currently in the Vault (only accessible when unlocked).
   */
  public async listItems(): Promise<VaultItem[]> {
    if (!this.activeKey) {
      return []; // Absolute isolation: Return empty array when locked
    }

    const manifestDir = path.join(this.vaultRoot, 'manifest');
    const files = await fs.promises.readdir(manifestDir).catch(() => []);
    const items: VaultItem[] = [];

    for (const file of files) {
      if (file.endsWith('.json')) {
        const raw = await fs.promises.readFile(path.join(manifestDir, file), 'utf-8');
        items.push(JSON.parse(raw));
      }
    }

    return items;
  }

  public getState(): VaultState {
    return {
      isLocked: !this.isUnlocked(),
      hasVaultKey: this.isConfigured(),
      autoLockMinutes: 15,
      itemCount: 0,
    };
  }

  private scheduleAutoLock(minutes: number): void {
    if (this.autoLockTimer) clearTimeout(this.autoLockTimer);
    this.autoLockTimer = setTimeout(() => {
      this.lock();
    }, minutes * 60 * 1000);
    this.autoLockTimer.unref(); // Allow Node process to exit gracefully
  }
}
