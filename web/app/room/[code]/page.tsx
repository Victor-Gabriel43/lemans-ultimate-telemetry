"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { colorForName } from "@lmu/shared";
import { getIdentity } from "@/lib/identity";
import { ensureRoomListenersAttached, useRoomStore } from "@/state/roomStore";

export default function RoomPage() {
  const params = useParams<{ code: string }>();
  const inviteCode = (params.code ?? "").toUpperCase();

  const { status, errorMessage, snapshot, join } = useRoomStore();
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
    return <RoomDashboardStub inviteCode={inviteCode} />;
  }

  if (status === "connecting" || status === "reconnecting") {
    return (
      <CenteredMessage>
        <p className="text-text-muted">Conectando à sala {inviteCode}…</p>
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

/**
 * Placeholder funcional — o layout de verdade (header fixo, cards, grid
 * responsivo) é construído na Fase 5. Isto aqui só prova que o join +
 * presença em tempo real funcionam ponta a ponta no navegador.
 */
function RoomDashboardStub({ inviteCode }: { inviteCode: string }) {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const userId = useRoomStore((s) => s.userId);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-xl font-semibold">{snapshot.room.name}</h1>
          <p className="text-sm text-text-muted">
            {snapshot.room.car} {snapshot.room.track ? `· ${snapshot.room.track}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-status-ok" aria-hidden />
          <span className="font-mono text-sm tracking-widest">{inviteCode}</span>
        </div>
      </header>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Conectados agora ({snapshot.connectedUsers.length})
        </h2>
        <ul className="flex flex-wrap gap-3">
          {snapshot.connectedUsers.map((u) => (
            <li key={u.socketId} className="flex items-center gap-2 rounded-full bg-surface-raised py-1 pl-1 pr-3">
              <span
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold text-brand-fg"
                style={{ backgroundColor: colorForName(u.userId) }}
              >
                {u.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="text-sm">
                {u.name}
                {u.userId === userId && <span className="text-text-muted"> (você)</span>}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-lg border border-border bg-surface p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Escala de pilotos (dados do seed — edição chega na Fase 7)
        </h2>
        <ul className="flex flex-col gap-2">
          {snapshot.scheduleRows.map((row) => (
            <li
              key={row.id}
              className={`flex items-center justify-between rounded-md px-3 py-2 text-sm ${
                row.status === "ACTIVE" ? "bg-surface-raised border-l-2 border-brand" : ""
              } ${row.status === "DONE" ? "opacity-50 line-through" : ""}`}
            >
              <span>{row.plannedLabel}</span>
              <span>{snapshot.drivers.find((d) => d.id === row.driverId)?.name ?? "—"}</span>
              <span className="text-text-muted">{row.durationMinutes}min</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
