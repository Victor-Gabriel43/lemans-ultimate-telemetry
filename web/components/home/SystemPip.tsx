"use client";

import { useSyncExternalStore } from "react";
import { getSocket } from "@/lib/socket";

type Link = "connecting" | "connected" | "offline";

// Estado de conexão compartilhado por assinatura — o socket é singleton, então
// um valor a nível de módulo basta e evita setState dentro de efeito.
let linkState: Link = "connecting";

function subscribe(onChange: () => void): () => void {
  const socket = getSocket();
  if (socket.connected) linkState = "connected";
  const onConnect = () => {
    linkState = "connected";
    onChange();
  };
  const onDown = () => {
    linkState = "offline";
    onChange();
  };
  socket.on("connect", onConnect);
  socket.on("disconnect", onDown);
  socket.on("connect_error", onDown);
  return () => {
    socket.off("connect", onConnect);
    socket.off("disconnect", onDown);
    socket.off("connect_error", onDown);
  };
}

/**
 * Indicador de sistema DISCRETO — um ponto + rótulo, para o header/footer.
 * Reflete o estado REAL da conexão Socket.IO (mesmo socket singleton da sala).
 * Não é um card, não ocupa espaço, não inventa métrica.
 */
export function SystemPip({ className = "" }: { className?: string }) {
  const link = useSyncExternalStore(
    subscribe,
    () => linkState,
    () => "connecting" as Link
  );

  const tone =
    link === "connected" ? "bg-brand" : link === "connecting" ? "bg-status-warning" : "bg-status-critical";
  const label =
    link === "connected" ? "SYSTEM ONLINE" : link === "connecting" ? "LINKING…" : "SYSTEM OFFLINE";

  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <span className="relative flex h-1.5 w-1.5" aria-hidden>
        {link !== "offline" && (
          <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${tone}`} />
        )}
        <span className={`relative inline-flex h-1.5 w-1.5 rounded-full ${tone}`} />
      </span>
      <span className="font-mono text-[0.65rem] tracking-[0.2em] text-text-muted">{label}</span>
    </span>
  );
}
