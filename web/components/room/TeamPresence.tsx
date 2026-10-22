"use client";

import { Users } from "lucide-react";
import { colorForName } from "@lmu/shared";
import { useRoomStore } from "@/state/roomStore";
import { Panel, StatusDot } from "@/components/ui/Panel";

/**
 * Presença da equipe — quem está conectado agora (snapshot.connectedUsers) e o
 * roster durável de quem já passou pela sala (snapshot.members). Só usa dados
 * que já chegam no snapshot; não há evento novo nem lógica de realtime aqui.
 */
export function TeamPresence() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const currentUserId = useRoomStore((s) => s.userId);
  const { connectedUsers, members } = snapshot;

  const onlineUserIds = new Set(connectedUsers.map((u) => u.userId));
  const offlineMembers = members.filter((m) => !onlineUserIds.has(m.userId));

  return (
    <Panel
      title="Team Members"
      icon={<Users size={13} aria-hidden />}
      className="lg:col-span-8"
      actions={
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <StatusDot tone="ok" pulse />
          {connectedUsers.length} ONLINE
        </span>
      }
    >
      <ul className="flex flex-col divide-y divide-border">
        {connectedUsers.map((u) => (
          <li key={u.socketId} className="flex items-center gap-3 py-2">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[0.7rem] font-semibold text-brand-fg"
              style={{ backgroundColor: colorForName(u.userId) }}
              aria-hidden
            >
              {u.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1 text-sm">
              {u.name}
              {u.userId === currentUserId && <span className="text-text-muted"> (você)</span>}
            </span>
            <StatusDot tone="ok" />
          </li>
        ))}

        {offlineMembers.map((m) => (
          <li key={m.userId} className="flex items-center gap-3 py-2 opacity-50">
            <span
              className="flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[0.7rem] font-semibold text-brand-fg"
              style={{ backgroundColor: colorForName(m.userId) }}
              aria-hidden
            >
              {m.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="flex-1 text-sm">{m.name}</span>
            <span className="eyebrow">offline</span>
          </li>
        ))}

        {connectedUsers.length === 0 && offlineMembers.length === 0 && (
          <li className="py-2 text-sm text-text-muted">
            Ninguém mais na sala. Compartilhe o código de convite para a equipe entrar.
          </li>
        )}
      </ul>
    </Panel>
  );
}
