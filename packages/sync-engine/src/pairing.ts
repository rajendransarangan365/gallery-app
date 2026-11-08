/**
 * @gallery/sync-engine - PairingManager
 * QR code pairing and mutual cryptographic handshake for trusted P2P sync.
 */

import crypto from 'node:crypto';
import type { PairingInvitation } from './types.js';

export interface TrustedPeerRecord {
  deviceId: string;
  deviceName: string;
  sharedSecret: string;
  pairedAt: string;
}

export class PairingManager {
  private activeInvitations = new Map<string, PairingInvitation>();
  private trustedPeers = new Map<string, TrustedPeerRecord>();

  /**
   * Creates a new pairing invitation with a 6-digit PIN and QR payload.
   */
  public createInvitation(
    hostName: string,
    hostAddress: string,
    tcpPort: number,
    ttlSeconds = 300
  ): PairingInvitation {
    const sessionId = crypto.randomUUID();
    // Cryptographically secure 6-digit PIN
    const pin = crypto.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + ttlSeconds * 1000;

    const qrPayload = JSON.stringify({
      v: 1,
      sid: sessionId,
      name: hostName,
      addr: hostAddress,
      port: tcpPort,
      pin,
      exp: expiresAt,
    });

    const invitation: PairingInvitation = {
      sessionId,
      hostName,
      pin,
      qrPayload,
      port: tcpPort,
      expiresAt,
    };

    this.activeInvitations.set(sessionId, invitation);
    return invitation;
  }

  /**
   * Verifies incoming pairing request PIN against active invitations.
   */
  public verifyPairing(
    sessionId: string,
    submittedPin: string,
    remoteDeviceId: string,
    remoteDeviceName: string
  ): { success: boolean; sharedSecret?: string; error?: string } {
    const invitation = this.activeInvitations.get(sessionId);

    if (!invitation) {
      return { success: false, error: 'Pairing session expired or not found.' };
    }

    if (Date.now() > invitation.expiresAt) {
      this.activeInvitations.delete(sessionId);
      return { success: false, error: 'Pairing session has timed out.' };
    }

    // Constant-time PIN comparison
    const expected = Buffer.from(invitation.pin);
    const provided = Buffer.from(submittedPin);
    if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
      return { success: false, error: 'Invalid pairing PIN code.' };
    }

    // Successful pairing: derive shared secret
    const sharedSecret = crypto.randomBytes(32).toString('hex');
    const record: TrustedPeerRecord = {
      deviceId: remoteDeviceId,
      deviceName: remoteDeviceName,
      sharedSecret,
      pairedAt: new Date().toISOString(),
    };

    this.trustedPeers.set(remoteDeviceId, record);
    this.activeInvitations.delete(sessionId);

    return { success: true, sharedSecret };
  }

  public isPeerTrusted(deviceId: string): boolean {
    return this.trustedPeers.has(deviceId);
  }

  public getTrustedPeers(): TrustedPeerRecord[] {
    return Array.from(this.trustedPeers.values());
  }

  public revokePeer(deviceId: string): boolean {
    return this.trustedPeers.delete(deviceId);
  }
}
