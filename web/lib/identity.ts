"use client";

/**
 * Identidade sem cadastro: userId gerado no navegador + nome escolhido,
 * guardados por sala em localStorage. Permite reconectar (F5, aba fechada
 * e reaberta) sem duplicar usuário na presença nem perder "quem eu sou".
 */

const STORAGE_KEY = "lmu:sessions";

interface StoredIdentity {
  userId: string;
  name: string;
}

type SessionsMap = Record<string, StoredIdentity>;

function readAll(): SessionsMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SessionsMap) : {};
  } catch {
    return {};
  }
}

function writeAll(sessions: SessionsMap): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function getIdentity(inviteCode: string): StoredIdentity | null {
  const sessions = readAll();
  return sessions[inviteCode.toUpperCase()] ?? null;
}

export function saveIdentity(inviteCode: string, identity: StoredIdentity): void {
  const sessions = readAll();
  sessions[inviteCode.toUpperCase()] = identity;
  writeAll(sessions);
}
