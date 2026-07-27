const PBKDF2_ITERATIONS = 310_000;

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export function getRandomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function importPasswordKey(password: string) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveKey",
    "deriveBits",
  ]);
}

export async function deriveAesGcmKey(password: string, salt: Uint8Array, iterations = PBKDF2_ITERATIONS) {
  const passwordKey = await importPasswordKey(password);
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: toArrayBuffer(salt),
      iterations,
      hash: "SHA-256",
    },
    passwordKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function encryptBytes(password: string, plaintext: Uint8Array, iterations = PBKDF2_ITERATIONS) {
  const salt = getRandomBytes(16);
  const iv = getRandomBytes(12);
  const key = await deriveAesGcmKey(password, salt, iterations);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(plaintext)),
  );

  return {
    salt,
    iv,
    iterations,
    ciphertext,
  };
}

export async function decryptBytes(
  password: string,
  salt: Uint8Array,
  iv: Uint8Array,
  ciphertext: Uint8Array,
  iterations: number,
) {
  const key = await deriveAesGcmKey(password, salt, iterations);
  return new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: toArrayBuffer(iv) }, key, toArrayBuffer(ciphertext)));
}

export async function sha256(bytes: Uint8Array) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
}
