// Descriptografa public/setups/data.enc no navegador.
// Formato e parâmetros espelham tools/setups/build-setups.mjs — mudar lá
// exige mudar aqui (e subir FORMAT_VERSION nos dois lados).

import type { SetupData } from "./catalog";

const FORMAT_VERSION = 1;
const PBKDF2_ITERATIONS = 600_000;
const SALT_LEN = 16;
const IV_LEN = 12;
const STORAGE_KEY = "lmu-setups-key";

export const DATA_URL = "/setups/data.enc";

export class WrongPasswordError extends Error {}
export class FormatError extends Error {}

export function cryptoSupported(): boolean {
  return typeof window !== "undefined" && !!window.crypto?.subtle && typeof DecompressionStream !== "undefined";
}

export async function fetchEncrypted(): Promise<Uint8Array> {
  const res = await fetch(DATA_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = new Uint8Array(await res.arrayBuffer());
  if (data[0] !== FORMAT_VERSION) throw new FormatError(`versão ${data[0]}`);
  return data;
}

function saltOf(data: Uint8Array) {
  return data.slice(1, 1 + SALT_LEN);
}

export async function deriveKey(password: string, data: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveKey",
  ]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltOf(data), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    true, // exportável: "Lembrar neste aparelho" guarda a chave, nunca a senha
    ["decrypt"],
  );
}

export async function decryptData(data: Uint8Array, key: CryptoKey): Promise<SetupData> {
  const iv = data.slice(1 + SALT_LEN, 1 + SALT_LEN + IV_LEN);
  let plain: ArrayBuffer;
  try {
    // WebCrypto espera ciphertext||tag, que é exatamente o resto do arquivo.
    plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data.slice(1 + SALT_LEN + IV_LEN));
  } catch {
    throw new WrongPasswordError();
  }
  const stream = new Blob([plain]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text()) as SetupData;
}

const toB64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function saveKey(key: CryptoKey, data: Uint8Array) {
  try {
    const raw = new Uint8Array(await crypto.subtle.exportKey("raw", key));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ salt: toB64(saltOf(data)), key: toB64(raw) }));
  } catch {
    // storage bloqueado (aba anônima etc) — só não lembra
  }
}

/** Chave salva só vale se o salt bater com o data.enc atual (senha trocada = salt novo). */
export async function loadSavedKey(data: Uint8Array): Promise<CryptoKey | null> {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { salt: string; key: string } | null;
    if (!saved) return null;
    if (saved.salt !== toB64(saltOf(data))) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return await crypto.subtle.importKey("raw", fromB64(saved.key), "AES-GCM", false, ["decrypt"]);
  } catch {
    return null;
  }
}

export function forgetKey() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
