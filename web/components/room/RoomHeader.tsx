"use client";

import type { ConnectedUser, Room } from "@lmu/shared";
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
  return (
    <header className="sticky top-0 z-10 border-b border-border bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80">
      {reconnecting && (
        <div className="bg-status-warning/15 px-4 py-1 text-center text-xs text-status-warning">
          Reconectando… os dados continuam salvos, só a conexão em tempo real caiu por um instante.
        </div>
      )}
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold sm:text-xl">{room.name}</h1>
          <p className="truncate text-sm text-text-muted">
            {room.car}
            {room.track ? ` · ${room.track}` : ""}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <PresenceAvatars users={connectedUsers} currentUserId={currentUserId} />
          <ExportButton inviteCode={room.inviteCode} />
          <CopyInviteButton inviteCode={room.inviteCode} reconnecting={reconnecting} />
        </div>
      </div>
    </header>
  );
}
