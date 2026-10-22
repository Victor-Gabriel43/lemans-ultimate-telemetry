import type { ConnectedUser } from "@lmu/shared";

/** Presença é efêmera — vive só em memória do processo, nunca no banco. */
const roomPresence = new Map<string, Map<string, ConnectedUser>>();

export function addPresence(roomId: string, socketId: string, user: ConnectedUser): void {
  if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Map());
  roomPresence.get(roomId)!.set(socketId, user);
}

export function removePresence(roomId: string, socketId: string): void {
  roomPresence.get(roomId)?.delete(socketId);
  if (roomPresence.get(roomId)?.size === 0) roomPresence.delete(roomId);
}

export function listPresence(roomId: string): ConnectedUser[] {
  return Array.from(roomPresence.get(roomId)?.values() ?? []);
}
