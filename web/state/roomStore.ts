"use client";

import { create } from "zustand";
import type {
  RoomSnapshot,
  ConnectedUser,
  Room,
  ScheduleRow,
  FuelEntry,
  TireEntry,
  DamageEntry,
  DamageSeverity,
  PitStop,
  EntrySource,
} from "@lmu/shared";
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
  logFuel: (
    entry: { lap: number; litersUsed: number | null; litersRemaining: number | null },
    source?: EntrySource
  ) => void;
  startTireStint: (compound: string) => void;
  logDamage: (part: string, severity: DamageSeverity, source?: EntrySource) => void;
  pushTelemetryDashboard: (patch: Partial<Room>) => void;
  repairDamage: (damageId: string) => void;
  startPitStop: (plan: {
    lap: number | null;
    fuelAddedLiters: number | null;
    tireChangeCompound: string | null;
    includeDriverChange: boolean;
    repairDamageIds: string[];
  }) => void;
  completePitStop: (pitStopId: string) => void;
  cancelPitStop: (pitStopId: string) => void;
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

  logFuel: (entry, source = "MANUAL") => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    getSocket().emit("fuel:log", { roomId: snapshot.room.id, ...entry, source, createdBy: userId });
  },

  startTireStint: (compound) => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    getSocket().emit("tire:newStint", {
      roomId: snapshot.room.id,
      compound,
      stintStartLap: snapshot.room.currentLap ?? 0,
      wearPercent: null,
      source: "MANUAL",
      createdBy: userId,
    });
  },

  logDamage: (part, severity, source = "MANUAL") => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    getSocket().emit("damage:log", {
      roomId: snapshot.room.id,
      part,
      severity,
      repairEstimateMinutes: null,
      source,
      createdBy: userId,
    });
  },

  repairDamage: (damageId) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    getSocket().emit("damage:repair", { roomId: snapshot.room.id, damageId });
  },

  startPitStop: (plan) => {
    const { snapshot, userId } = useRoomStore.getState();
    if (!snapshot || !userId) return;
    getSocket().emit("pitstop:start", { roomId: snapshot.room.id, ...plan, createdBy: userId });
  },

  completePitStop: (pitStopId) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    getSocket().emit("pitstop:complete", { roomId: snapshot.room.id, pitStopId });
  },

  cancelPitStop: (pitStopId) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    getSocket().emit("pitstop:cancel", { roomId: snapshot.room.id, pitStopId });
  },

  pushTelemetryDashboard: (patch) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    useRoomStore.setState({ snapshot: { ...snapshot, room: { ...snapshot.room, ...patch } } });
    getSocket().emit("telemetry:push", { roomId: snapshot.room.id, patch });
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

  socket.on("tire:changed", (tireLog: TireEntry[]) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    useRoomStore.setState({ snapshot: { ...snapshot, tireLog } });
  });

  socket.on("damage:changed", (damageLog: DamageEntry[]) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    useRoomStore.setState({ snapshot: { ...snapshot, damageLog } });
  });

  socket.on("pitstop:changed", (pitStops: PitStop[]) => {
    const { snapshot } = useRoomStore.getState();
    if (!snapshot) return;
    useRoomStore.setState({ snapshot: { ...snapshot, pitStops } });
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
