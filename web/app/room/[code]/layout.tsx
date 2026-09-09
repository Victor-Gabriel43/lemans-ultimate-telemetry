"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Radio } from "lucide-react";
import { getIdentity } from "@/lib/identity";
import { ensureRoomListenersAttached, useRoomStore } from "@/state/roomStore";
import { RoomHeader } from "@/components/room/RoomHeader";
import { AlertsToast } from "@/components/alerts/AlertsToast";
import { primaryButton, fieldInput, StatusDot } from "@/components/ui/Panel";

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
      return;
    }
    // Sem identidade salva pra ESTA sala: se o store ainda carrega OUTRA sala
    // (usuário navegou de /room/A pra /room/B), limpa antes de pedir o nome —
    // senão o estado antigo continuaria em memória.
    const s = useRoomStore.getState();
    if (s.inviteCode && s.inviteCode !== inviteCode) s.reset();
  }, [inviteCode, join]);

  // Só considera "dentro da sala" quando o snapshot em mãos é REALMENTE o
  // desta URL. Sem essa checagem, um snapshot antigo (sala anterior) seria
  // renderizado em /room/{outro-código} — é a causa visível do bug de "join
  // volta pra sala errada".
  const snapshotMatchesUrl = snapshot?.room.inviteCode === inviteCode;

  // Reconectando com o snapshot ainda em mãos: mantém a sala inteira visível
  // (só o indicador do header muda) — sumir com a tela inteira numa
  // instabilidade de rede de 1-2s seria pior experiência.
  if ((status === "joined" || status === "reconnecting") && snapshot && snapshotMatchesUrl) {
    return (
      <div className="flex flex-1 flex-col">
        <AlertsToast />
        <RoomHeader
          room={snapshot.room}
          connectedUsers={snapshot.connectedUsers}
          currentUserId={userId}
          reconnecting={status === "reconnecting"}
        />
        <main className="mx-auto w-full max-w-[1600px] flex-1 px-3 py-4 sm:px-4 sm:py-5">{children}</main>
      </div>
    );
  }

  if (status === "connecting" || status === "reconnecting") {
    return (
      <CenteredShell code={inviteCode}>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <StatusDot tone="brand" pulse />
          {status === "reconnecting" ? "Reconectando à sala" : "Conectando à sala"} {inviteCode}…
        </div>
      </CenteredShell>
    );
  }

  if (status === "error") {
    return (
      <CenteredShell code={inviteCode}>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="eyebrow text-status-critical">Falha ao entrar</p>
          <p className="text-sm text-text">{errorMessage}</p>
          <Link
            href="/"
            className="text-xs uppercase tracking-wide text-brand transition-opacity hover:opacity-80"
          >
            Voltar à tela inicial
          </Link>
        </div>
      </CenteredShell>
    );
  }

  // idle — pede o nome (fallback quando não há identidade salva pra esta sala)
  return (
    <CenteredShell code={inviteCode}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (nameInput.trim()) void join(inviteCode, nameInput.trim());
        }}
        className="flex w-full max-w-sm flex-col gap-5 border border-border bg-surface p-5"
      >
        <div className="flex flex-col gap-1">
          <span className="eyebrow">Entrando na sala</span>
          <span className="font-mono text-2xl font-semibold tracking-[0.3em]">{inviteCode}</span>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="eyebrow">Seu nome (como a equipe vai te ver)</span>
          <input
            required
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Ex: Estrategista"
            className={`${fieldInput} w-full`}
          />
        </label>
        <button type="submit" className={primaryButton}>
          Entrar
        </button>
      </form>
    </CenteredShell>
  );
}

function CenteredShell({ code, children }: { code: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border px-4 py-3">
        <Link href="/" className="flex items-center gap-2" title="RACEOPS">
          <Radio size={16} className="text-brand" aria-hidden />
          <span className="font-mono text-sm font-semibold tracking-[0.18em]">RACEOPS</span>
          <span className="eyebrow ml-1">/ {code}</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6">{children}</main>
    </div>
  );
}
