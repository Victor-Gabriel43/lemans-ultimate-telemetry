import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import type { ClientToServerEvents, ServerToClientEvents } from "@lmu/shared";

const PORT = Number(process.env.PORT ?? 4001);
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:3000";

const app = express();
app.use(cors({ origin: WEB_ORIGIN }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "lmu-race-engineer-server" });
});

const httpServer = createServer(app);

const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
  cors: { origin: WEB_ORIGIN },
});

io.on("connection", (socket) => {
  console.log(`[socket] conectado: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`[socket] desconectado: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] ouvindo em http://localhost:${PORT}`);
});
