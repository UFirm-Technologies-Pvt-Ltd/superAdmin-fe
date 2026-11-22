/**
 * Enterprise Client-Side Password Encryption (Web Crypto API)
 * Mirrors Meta / Instagram's #PWD_BROWSER architecture using native RSA-OAEP SHA-256.
 * Zero npm dependencies required.
 */

const DEFAULT_KEY_TTL_MS = 60 * 60 * 1000; // 1 hour TTL

let cachedKey = null;
let keyFetchPromise = null;
let serverTimeOffsetSec = 0;

function pemToSpkiDer(pem) {
  const b64 = pem
    .replace(/-----BEGIN [A-Z0-9 _-]+-----/g, "")
    .replace(/-----END [A-Z0-9 _-]+-----/g, "")
    .replace(/[\r\n\s]/g, "");

  const binaryString = atob(b64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function getOrFetchEncryptionKey(apiBaseUrl = "") {
  const now = Date.now();
  if (cachedKey && cachedKey.expiresAt > now) {
    return cachedKey;
  }

  if (!keyFetchPromise) {
    keyFetchPromise = (async () => {
      const base = apiBaseUrl || import.meta.env.VITE_API_BASE || "";
      const normalizedBase = base.replace(/\/+$/, "");
      const response = await fetch(`${normalizedBase}/auth/encryption-key`, {
        headers: { Accept: "application/json" },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch encryption key: ${response.statusText}`);
      }

      const data = await response.json();
      const localNow = Math.floor(Date.now() / 1000);
      const serverTs = data.serverTimestamp || data.ServerTimestamp || localNow;
      serverTimeOffsetSec = serverTs - localNow;

      const rawPem = data.publicKey || data.PublicKey;
      if (!rawPem) {
        throw new Error("Invalid encryption key response: missing public key");
      }

      const derBuffer = pemToSpkiDer(rawPem);
      const cryptoKey = await window.crypto.subtle.importKey(
        "spki",
        derBuffer,
        {
          name: "RSA-OAEP",
          hash: "SHA-256",
        },
        false,
        ["encrypt"]
      );

      const serverTtlSec = Number(data.keyTtlSec || data.KeyTtlSec || data.ttl || data.Ttl);
      const ttlMs = serverTtlSec > 0 ? serverTtlSec * 1000 : DEFAULT_KEY_TTL_MS;

      cachedKey = {
        cryptoKey,
        keyId: data.keyId || data.KeyId || "1",
        expiresAt: Date.now() + ttlMs,
      };
      return cachedKey;
    })().finally(() => {
      keyFetchPromise = null;
    });
  }

  return keyFetchPromise;
}

export async function encryptPassword(plainPassword, apiBaseUrl = "") {
  if (!plainPassword) return plainPassword;

  if (!window.crypto || !window.crypto.subtle) {
    throw new Error("[SECURITY_ERROR] Web Crypto API is unavailable. Secure HTTPS connection required.");
  }

  try {
    const { cryptoKey, keyId } = await getOrFetchEncryptionKey(apiBaseUrl);
    const clientTimestamp = Math.floor(Date.now() / 1000) + serverTimeOffsetSec;

    // Packaging anti-tamper envelope: timestamp:plainPassword
    const payloadBytes = new TextEncoder().encode(`${clientTimestamp}:${plainPassword}`);

    const cipherBuffer = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      cryptoKey,
      payloadBytes
    );

    const base64Cipher = arrayBufferToBase64(cipherBuffer);
    return `#ENC_AUTH:${keyId}:${clientTimestamp}:${base64Cipher}`;
  } catch (error) {
    console.error("[SECURITY] Password encryption failed:", error);
    throw new Error(`[ENCRYPTION_FAILED] Password encryption failed: ${error.message}`);
  }
}

export function clearEncryptionKeyCache() {
  cachedKey = null;
}
