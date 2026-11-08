/**
 * @gallery/shared - Cryptographic & Hashing Utilities
 */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';

/**
 * Computes SHA-256 hash of a file stream.
 */
export async function computeFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

/**
 * Computes SHA-256 hash of a buffer or string.
 */
export function computeBufferHash(data: Buffer | string): string {
  return createHash('sha256').update(data).digest('hex');
}

