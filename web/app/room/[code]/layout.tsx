"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { getIdentity } from "@/lib/identity";
import { ensureRoomListenersAttached, useRoomStore } from "@/state/roomStore";
import { RoomHeader } from "@/components/room/RoomHeader";

export default function RoomLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ code: string }>();
  const inviteCode = (params.code ?? "").toUpperCase();

  const { status, errorMessage, snapshot, userId, join } = useRoomStore();
  const [nameInput, setNameInput] = useState("");

  useEffect(() => {
    ensureRoomListenersAttached();
  }, []);

  useEffect(() => {
    if (!inviteCode) return;
    const identity = getIdentity(inviteCode);
    if (identity) {
      void join(inviteCode, identity.name);
    }
  }, [inviteCode, join]);

  if (status === "joined" && snapshot) {
    return (
      <div className="flex flex-1 flex-col">
        <RoomHeader room={snapshot.room} connectedUsers={snapshot.connectedUsers} currentUserId={userId} />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>
      </div>
    );
  }

  if (status === "connecting" || status === "reconnecting") {
    return (
      <CenteredMessage>
        <p className="text-text-muted">
          {status === "reconnecting" ? "Reconectando à sala" : "Conectando à sala"} {inviteCode}…
        </p>
      </CenteredMessage>
    );
  }

  if (status === "error") {
    return (
      <CenteredMessage>
        <p className="text-status-critical">{errorMessage}</p>
        <Link href="/" className="text-sm text-brand hover:underline">
          Voltar pra tela inicial
        </Link>
      </CenteredMessage>
    );
  }

  // idle — pede o nome pra entrar (fallback quando não há identidade salva pra esta sala)
  return (
    <CenteredMessage>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nameInput.trim()) void join(inviteCode, nameInput.trim());
        }}
        className="flex w-full max-w-sm flex-col gap-4"
      >
        <div>
          <p className="text-sm text-text-muted">Entrando na sala</p>
          <p className="font-mono text-2xl tracking-widest">{inviteCode}</p>
        </div>
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="text-text-muted">Seu nome</span>
          <input
            required
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Como a equipe vai te ver"
            className="w-full rounded-md border border-border bg-surface px-3 py-2.5 text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          />
        </label>
        <button
          type="submit"
          className="min-h-12 cursor-pointer rounded-md bg-brand px-4 py-3 font-medium text-brand-fg transition-opacity hover:opacity-90"
        >
          Entrar
        </button>
      </form>
    </CenteredMessage>
  );
}

function CenteredMessage({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">{children}</main>
  );
}
