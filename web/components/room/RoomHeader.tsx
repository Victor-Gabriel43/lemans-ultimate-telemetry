"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Radio } from "lucide-react";
import type { ConnectedUser, Room } from "@lmu/shared";
import { formatClock } from "@/lib/format";
import { StatusDot } from "@/components/ui/Panel";
import { PresenceAvatars } from "./PresenceAvatars";
import { CopyInviteButton } from "./CopyInviteButton";
import { ExportButton } from "./ExportButton";

export function RoomHeader({
  room,
  connectedUsers,
  currentUserId,
  reconnecting = false,
}: {
  room: Room;
  connectedUsers: ConnectedUser[];
  currentUserId: string | null;
  reconnecting?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startedAtMs = room.raceStartedAt ? new Date(room.raceStartedAt).getTime() : null;
  const elapsedSec = startedAtMs != null ? (now - startedAtMs) / 1000 : null;
  const raceStatus = startedAtMs == null ? "PRÉ-LARGADA" : "EM CORRIDA";
  const raceStatusTone = startedAtMs == null ? "text-text-muted" : "text-status-ok";

  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      {reconnecting && (
        <div className="border-b border-status-warning/30 bg-status-warning/10 px-4 py-1 text-center text-xs text-status-warning">
          Reconectando ao servidor da corrida — os dados continuam salvos.
        </div>
      )}
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-3 px-4 py-2.5 lg:flex-row lg:items-stretch lg:gap-0">
        {/* Identidade + sala */}
        <div className="flex items-center gap-4 lg:pr-5">
          <Link href="/" className="flex items-center gap-2" title="RACEOPS">
            <Radio size={16} className="text-brand" aria-hidden />
            <span className="font-mono text-sm font-semibold tracking-[0.18em]">RACEOPS</span>
          </Link>
          <div className="flex flex-col leading-tight">
            <span className="eyebrow">Room</span>
            <span className="font-mono text-sm font-semibold tracking-[0.2em] text-text">{room.inviteCode}</span>
          </div>
        </div>

        {/* Strip técnico */}
        <div className="grid flex-1 grid-cols-2 divide-x divide-border border-y border-border sm:grid-cols-4 lg:border-x lg:border-y-0">
          <HeaderCell label="Track" value={room.track || "—"} />
          <HeaderCell label="Race" value={raceStatus} valueClass={`${raceStatusTone} font-semibold`} />
          <HeaderCell
            label="Session"
            value={elapsedSec != null ? formatClock(elapsedSec) : "00:00"}
            mono
          />
          <HeaderCell
            label="Connection"
            value={
              <span className="flex items-center gap-1.5">
                <StatusDot tone={reconnecting ? "warning" : "ok"} pulse />
                {reconnecting ? "RECONNECTING" : "LIVE"}
              </span>
            }
          />
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 lg:pl-5">
          <PresenceAvatars users={connectedUsers} currentUserId={currentUserId} />
          <ExportButton inviteCode={room.inviteCode} />
          <CopyInviteButton inviteCode={room.inviteCode} reconnecting={reconnecting} />
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1600px] truncate px-4 pb-2 text-xs text-text-muted">
        {room.name}
        {room.car ? <span className="text-text-dim"> · {room.car}</span> : null}
      </div>
    </header>
  );
}

function HeaderCell({
  label,
  value,
  valueClass = "",
  mono = false,
}: {
  label: string;
  value: React.ReactNode;
  valueClass?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-1.5">
      <span className="eyebrow">{label}</span>
      <span className={`truncate text-sm ${mono ? "font-mono tabular-nums" : ""} ${valueClass}`}>{value}</span>
    </div>
  );
}
