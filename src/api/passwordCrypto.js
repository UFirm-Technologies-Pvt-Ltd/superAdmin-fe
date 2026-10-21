/**
 * Enterprise Client-Side Password Encryption (Web Crypto API)
 * Mirrors Meta / Instagram's #PWD_BROWSER architecture using native RSA-OAEP SHA-256.
 * Zero npm dependencies required.
 */

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
  if (cachedKey) return cachedKey;

  if (!keyFetchPromise) {
    keyFetchPromise = (async () => {
      const normalizedBase = apiBaseUrl.replace(/\/+$/, "");
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

      cachedKey = {
        cryptoKey,
        keyId: data.keyId || data.KeyId || "1",
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

  // Fallback if browser environment lacks WebCrypto
  if (!window.crypto || !window.crypto.subtle) {
    console.warn("[SECURITY] Web Crypto API not available. Sending unencrypted fallback.");
    return plainPassword;
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
    console.error("[SECURITY] Password encryption error:", error);
    // Return original password so login can proceed via fallback if configured
    return plainPassword;
  }
}

export function clearEncryptionKeyCache() {
  cachedKey = null;
}
