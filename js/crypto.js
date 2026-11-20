/**
 * DungeonCrypto — Web Crypto PBKDF2-SHA256 + AES-256-GCM helpers
 * Used by both the live game (decryption) and tools/forge.html (encryption).
 */
(function (global) {
  'use strict';

  const ITERATIONS = 120000;
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();

  function toBase64(uint8) {
    let binary = '';
    const chunkSize = 0x8000;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, uint8.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  }

  function fromBase64(b64) {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * Normalizes candidate solution strings so minor casing or whitespace
   * differences don't break decryption for text-based seals.
   */
  function normalizeAnswer(raw) {
    return String(raw == null ? '' : raw)
      .trim()
      .replace(/\s+/g, ' ')
      .toUpperCase();
  }

  async function deriveAesKey(passphrase, saltBytes) {
    if (!global.crypto || !global.crypto.subtle) {
      throw new Error(
        'Web Crypto API is unavailable. Serve this page over HTTPS (like GitHub Pages) or localhost.'
      );
    }
    const baseKey = await global.crypto.subtle.importKey(
      'raw',
      textEncoder.encode(normalizeAnswer(passphrase)),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return global.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
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
   * Encrypts a JSON-serializable room payload with the previous room's solution.
   */
  async function encryptPayload(payloadObj, passphrase) {
    const salt = global.crypto.getRandomValues(new Uint8Array(16));
    const iv = global.crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(passphrase, salt);
    const plaintext = textEncoder.encode(JSON.stringify(payloadObj));

    const cipherBuf = await global.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      plaintext
    );

    return {
      salt: toBase64(salt),
      iv: toBase64(iv),
      ciphertext: toBase64(new Uint8Array(cipherBuf)),
    };
  }

  /**
   * Attempts to decrypt an encrypted room entry using a candidate solution.
   * Returns the parsed room object on success, or null if the key is wrong.
   */
  async function decryptPayload(encryptedEntry, candidateAnswer) {
    const salt = fromBase64(encryptedEntry.salt);
    const iv = fromBase64(encryptedEntry.iv);
    const ciphertext = fromBase64(encryptedEntry.ciphertext);

    const key = await deriveAesKey(candidateAnswer, salt);
    try {
      const plainBuf = await global.crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        ciphertext
      );
      return JSON.parse(textDecoder.decode(plainBuf));
    } catch (_err) {
      // AES-GCM authentication tag mismatch indicates incorrect solution
      return null;
    }
  }

  global.DungeonCrypto = {
    ITERATIONS,
    normalizeAnswer,
    encryptPayload,
    decryptPayload,
  };
})(window);
