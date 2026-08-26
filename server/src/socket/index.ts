import type { Server, Socket } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, ConnectedUser } from "@lmu/shared";
import { colorForName } from "@lmu/shared";
import { findRoomByInviteCode, getRoomSnapshot } from "../rooms/roomService.js";
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

    socket.on("disconnect", () => {
      const { roomId } = socket.data;
      if (!roomId) return;
      removePresence(roomId, socket.id);
      io.to(roomId).emit("presence:update", listPresence(roomId));
    });
  });
}
