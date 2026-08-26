"use client";

import { create } from "zustand";
import type { RoomSnapshot, ConnectedUser, Room, ScheduleRow, FuelEntry, EntrySource } from "@lmu/shared";
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
  addScheduleRow: (afterRowId?: string) => void;
  updateScheduleRow: (rowId: string, patch: Partial<ScheduleRow>) => void;
  removeScheduleRow: (rowId: string) => void;
  reorderScheduleRow: (rowId: string, direction: "up" | "down") => void;
  logFuel: (entry: { lap: number; litersUsed: number | null; litersRemaining: number | null }) => void;
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

  addScheduleRow: (afterRowId) => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    getSocket().emit("schedule:add", { roomId: snapshot.room.id, afterRowId, updatedBy: userId });
  },

  updateScheduleRow: (rowId, patch) => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    // otimista, igual ao updateDashboard — o servidor confirma via schedule:changed
    useRoomStore.setState({
      snapshot: {
        ...snapshot,
        scheduleRows: snapshot.scheduleRows.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
      },
    });
    getSocket().emit("schedule:update", { roomId: snapshot.room.id, rowId, patch, updatedBy: userId });
  },

  removeScheduleRow: (rowId) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    getSocket().emit("schedule:remove", { roomId: snapshot.room.id, rowId });
  },

  reorderScheduleRow: (rowId, direction) => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    getSocket().emit("schedule:reorder", { roomId: snapshot.room.id, rowId, direction, updatedBy: userId });
  },

  logFuel: (entry) => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    const source: EntrySource = "MANUAL";
    getSocket().emit("fuel:log", { roomId: snapshot.room.id, ...entry, source, createdBy: userId });
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

  socket.on("schedule:changed", (scheduleRows: ScheduleRow[]) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    useRoomStore.setState({ snapshot: { ...snapshot, scheduleRows } });
  });

  socket.on("fuel:changed", (fuelLog: FuelEntry[]) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    useRoomStore.setState({ snapshot: { ...snapshot, fuelLog } });
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
