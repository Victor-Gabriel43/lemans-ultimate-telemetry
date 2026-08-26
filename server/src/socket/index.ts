import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, ConnectedUser } from "@lmu/shared";
import { colorForName } from "@lmu/shared";
import { findRoomByInviteCode, getRoomSnapshot, updateRoomDashboard, upsertRoomMember } from "../rooms/roomService.js";
import {
  addScheduleRow,
  listScheduleRows,
  removeScheduleRow,
  reorderScheduleRow,
  updateScheduleRow,
} from "../rooms/scheduleService.js";
import { listFuelLog, logFuelEntry } from "../rooms/fuelService.js";
import { listTireLog, startNewTireStint } from "../rooms/tireService.js";
import { listDamageLog, logDamageEntry, markDamageRepaired } from "../rooms/damageService.js";
import { addPresence, removePresence, listPresence } from "./presence.js";

export interface SocketData {
  roomId?: string;
  userId?: string;
  name?: string;
}

type AppServer = Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;
type AppSocket = Socket<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>;

export function registerSocketHandlers(io: AppServer): void {
  io.on("connection", (socket: AppSocket) => {
    // Só quem já deu join nesta sala (nesta conexão) pode mutar ela — evita
    // que um cliente mande roomId de outra sala por engano/malícia.
    function ownsRoom(roomId: string): boolean {
      return socket.data.roomId === roomId;
    }

    async function broadcastSchedule(roomId: string) {
      io.to(roomId).emit("schedule:changed", await listScheduleRows(roomId));
    }

    socket.on("room:join", async (payload, ack) => {
      try {
        const room = await findRoomByInviteCode(payload.inviteCode);
        if (!room) {
          ack({ ok: false, error: "Sala não encontrada. Confira o código do convite." });
          return;
        }

        const name = payload.name.trim().slice(0, 40) || "Sem nome";
        const userId = payload.userId ?? crypto.randomUUID();

        socket.data.roomId = room.id;
        socket.data.userId = userId;
        socket.data.name = name;
        socket.join(room.id);

        const user: ConnectedUser = {
          socketId: socket.id,
          userId,
          name,
          colorHex: colorForName(userId),
          connectedAt: new Date().toISOString(),
        };
        addPresence(room.id, socket.id, user);
        await upsertRoomMember(room.id, userId, name);

        const snapshot = await getRoomSnapshot(room.id);
        if (!snapshot) {
          ack({ ok: false, error: "Sala encontrada, mas os dados sumiram. Tente de novo." });
          return;
        }
        snapshot.connectedUsers = listPresence(room.id);

        ack({ ok: true, snapshot, userId });
        io.to(room.id).emit("presence:update", listPresence(room.id));
      } catch (err) {
        console.error("[socket] erro em room:join", err);
        ack({ ok: false, error: "Erro inesperado ao entrar na sala." });
      }
    });

    socket.on("dashboard:update", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        const updated = await updateRoomDashboard(payload.roomId, payload.patch);
        io.to(payload.roomId).emit("room:updated", updated);
      } catch (err) {
        console.error("[socket] erro em dashboard:update", err);
      }
    });

    socket.on("schedule:add", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        await addScheduleRow(payload.roomId, payload.afterRowId, payload.updatedBy);
        await broadcastSchedule(payload.roomId);
      } catch (err) {
        console.error("[socket] erro em schedule:add", err);
      }
    });

    socket.on("schedule:update", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        await updateScheduleRow(payload.roomId, payload.rowId, payload.patch, payload.updatedBy);
        await broadcastSchedule(payload.roomId);
      } catch (err) {
        console.error("[socket] erro em schedule:update", err);
      }
    });

    socket.on("schedule:remove", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        await removeScheduleRow(payload.roomId, payload.rowId);
        await broadcastSchedule(payload.roomId);
      } catch (err) {
        console.error("[socket] erro em schedule:remove", err);
      }
    });

    socket.on("schedule:reorder", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        await reorderScheduleRow(payload.roomId, payload.rowId, payload.direction, payload.updatedBy);
        await broadcastSchedule(payload.roomId);
      } catch (err) {
        console.error("[socket] erro em schedule:reorder", err);
      }
    });

    socket.on("fuel:log", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        await logFuelEntry(payload.roomId, payload);
        io.to(payload.roomId).emit("fuel:changed", await listFuelLog(payload.roomId));
      } catch (err) {
        console.error("[socket] erro em fuel:log", err);
      }
    });

    socket.on("tire:newStint", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        await startNewTireStint(payload.roomId, payload.compound, payload.createdBy);
        io.to(payload.roomId).emit("tire:changed", await listTireLog(payload.roomId));
      } catch (err) {
        console.error("[socket] erro em tire:newStint", err);
      }
    });

    socket.on("damage:log", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        await logDamageEntry(payload.roomId, payload.part, payload.severity, payload.createdBy);
        io.to(payload.roomId).emit("damage:changed", await listDamageLog(payload.roomId));
      } catch (err) {
        console.error("[socket] erro em damage:log", err);
      }
    });

    socket.on("damage:repair", async (payload) => {
      if (!ownsRoom(payload.roomId)) return;
      try {
        await markDamageRepaired(payload.roomId, payload.damageId);
        io.to(payload.roomId).emit("damage:changed", await listDamageLog(payload.roomId));
      } catch (err) {
        console.error("[socket] erro em damage:repair", err);
      }
    });

    socket.on("disconnect", () => {
      const { roomId } = socket.data;
      if (!roomId) return;
      removePresence(roomId, socket.id);
      io.to(roomId).emit("presence:update", listPresence(roomId));
    });
  });
}
