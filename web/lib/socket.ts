"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "@lmu/shared";

export const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:4001";

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | undefined;

/** Singleton — uma conexão por aba, reaproveitada por todos os componentes/hooks. */
export function getSocket(): AppSocket {
  if (!socket) {
    socket = io(SERVER_URL, { autoConnect: true, transports: ["websocket", "polling"] });
  }
  return socket;
}
