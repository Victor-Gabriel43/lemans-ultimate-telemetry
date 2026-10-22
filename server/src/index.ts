import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents, RaceDurationType } from "@lmu/shared";
import { createRoom, findRoomByInviteCode, getRoomSnapshot } from "./rooms/roomService.js";
import { buildScheduleCsv } from "./rooms/exportService.js";
import { registerSocketHandlers, type SocketData } from "./socket/index.js";

const PORT = Number(process.env.PORT ?? 4001);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: WEB_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "lmu-race-engineer-server" });
});

app.post("/rooms", async (req, res) => {
  const { name, car, track, raceDurationType, raceDurationValue } = req.body ?? {};

  if (raceDurationType !== "TIME" && raceDurationType !== "LAPS") {
    res.status(400).json({ error: "raceDurationType deve ser 'TIME' ou 'LAPS'." });
    return;
  }
  const durationValue = Number(raceDurationValue);
  if (!Number.isFinite(durationValue) || durationValue <= 0) {
    res.status(400).json({ error: "raceDurationValue deve ser um número maior que zero." });
    return;
  }

  const room = await createRoom({
    name: String(name ?? ""),
    car: String(car ?? ""),
    track: track ? String(track) : undefined,
    raceDurationType: raceDurationType as RaceDurationType,
    raceDurationValue: durationValue,
  });

  res.status(201).json({ id: room.id, inviteCode: room.inviteCode });
});

app.get("/rooms/:inviteCode/export", async (req, res) => {
  const room = await findRoomByInviteCode(req.params.inviteCode);
  if (!room) {
    res.status(404).json({ error: "Sala não encontrada." });
    return;
  }
  const snapshot = await getRoomSnapshot(room.id);
  if (!snapshot) {
    res.status(404).json({ error: "Sala não encontrada." });
    return;
  }

  if (req.query.format === "csv") {
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="escala-${room.inviteCode}.csv"`);
    res.send(buildScheduleCsv(snapshot));
    return;
  }

  res.setHeader("Content-Disposition", `attachment; filename="corrida-${room.inviteCode}.json"`);
  res.json(snapshot);
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents, Record<string, never>, SocketData>(httpServer, {
  cors: { origin: WEB_ORIGIN },
});

registerSocketHandlers(io);

httpServer.listen(PORT, () => {
  console.log(`[server] ouvindo em http://localhost:${PORT}`);
});
