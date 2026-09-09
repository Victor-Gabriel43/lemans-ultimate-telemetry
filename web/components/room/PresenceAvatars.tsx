"use client";

import { colorForName, type ConnectedUser } from "@lmu/shared";

/**
 * Presença compacta pro header — avatares sobrepostos com iniciais. A lista
 * completa (online + offline) vive no painel Team Members do dashboard.
 */
export function PresenceAvatars({
  users,
  currentUserId,
}: {
  users: ConnectedUser[];
  currentUserId: string | null;
}) {
  if (users.length === 0) return null;
  const shown = users.slice(0, 5);
  const extra = users.length - shown.length;

  return (
    <div
      className="flex items-center"
      title={users.map((u) => `${u.name}${u.userId === currentUserId ? " (você)" : ""}`).join(", ")}
    >
      {shown.map((u, i) => (
        <span
          key={u.socketId}
          className={`flex h-7 w-7 shrink-0 items-center justify-center border border-bg font-mono text-[0.65rem] font-semibold text-brand-fg ${
            i > 0 ? "-ml-2" : ""
          }`}
          style={{ backgroundColor: colorForName(u.userId) }}
          aria-hidden
        >
          {u.name.slice(0, 2).toUpperCase()}
        </span>
      ))}
      {extra > 0 && (
        <span className="-ml-2 flex h-7 w-7 shrink-0 items-center justify-center border border-bg bg-surface-raised font-mono text-[0.65rem] text-text-muted">
          +{extra}
        </span>
      )}
    </div>
  );
}
