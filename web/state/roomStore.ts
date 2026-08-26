"use client";

import { create } from "zustand";
import type { RoomSnapshot, ConnectedUser, Room } from "@lmu/shared";
import { getSocket } from "@/lib/socket";
import { getIdentity, saveIdentity } from "@/lib/identity";

export type RoomConnectionStatus = "idle" | "connecting" | "joined" | "error" | "reconnecting";

interface RoomState {
  status: RoomConnectionStatus;
  errorMessage: string | null;
  inviteCode: string | null;
  userId: string | null;
  name: string | null;
  snapshot: RoomSnapshot | null;
  join: (inviteCode: string, name: string) => Promise<void>;
  updateDashboard: (patch: Partial<Room>) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  status: "idle",
  errorMessage: null,
  inviteCode: null,
  userId: null,
  name: null,
  snapshot: null,

  join: async (inviteCodeRaw: string, name: string) => {
    const inviteCode = inviteCodeRaw.toUpperCase().trim();
    const existing = getIdentity(inviteCode);
    const socket = getSocket();

    set({ status: "connecting", errorMessage: null, inviteCode, name });

    await new Promise<void>((resolve) => {
      socket.emit(
        "room:join",
        { inviteCode, name, userId: existing?.userId },
        (result) => {
          if (!result.ok) {
            set({ status: "error", errorMessage: result.error });
            resolve();
            return;
          }
          saveIdentity(inviteCode, { userId: result.userId, name });
          set({
            status: "joined",
            userId: result.userId,
            snapshot: result.snapshot,
            errorMessage: null,
          });
          resolve();
        }
      );
    });
  },

  updateDashboard: (patch) => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    // otimista: aplica local já, o servidor confirma via "room:updated"
    // (o próprio emissor também recebe esse evento, então não precisa
    // reconciliar nada especial — só sobrescreve com o valor de novo).
    useRoomStore.setState({ snapshot: { ...snapshot, room: { ...snapshot.room, ...patch } } });
    getSocket().emit("dashboard:update", { roomId: snapshot.room.id, patch, updatedBy: userId });
  },
}));

// Listeners de socket anexados uma única vez por aba (o socket é singleton).
// Reconexão automática do Socket.IO dispara "connect" de novo — se já
// tínhamos entrado numa sala, refazemos o room:join pra reaparecer na
// presença e pegar um snapshot fresco (o servidor não guarda presença
// entre desconexões).
let listenersAttached = false;

export function ensureRoomListenersAttached(): void {
  if (listenersAttached || typeof window === "undefined") return;
  listenersAttached = true;

  const socket = getSocket();

  socket.on("presence:update", (connectedUsers: ConnectedUser[]) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    useRoomStore.setState({ snapshot: { ...snapshot, connectedUsers } });
  });

  socket.on("room:updated", (room: Room) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    useRoomStore.setState({ snapshot: { ...snapshot, room } });
  });

  socket.on("connect", () => {
    const { status, inviteCode, name } = useRoomStore.getState();
    if (status === "joined" || status === "reconnecting") {
      if (inviteCode && name) {
        useRoomStore.setState({ status: "reconnecting" });
        void useRoomStore.getState().join(inviteCode, name);
      }
    }
  });

  socket.on("disconnect", () => {
    const { status } = useRoomStore.getState();
    if (status === "joined") {
      useRoomStore.setState({ status: "reconnecting" });
    }
  });
}
