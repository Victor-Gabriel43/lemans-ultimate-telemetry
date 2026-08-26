"use client";

import { colorForName, type ConnectedUser } from "@lmu/shared";

export function PresenceAvatars({
  users,
  currentUserId,
}: {
  users: ConnectedUser[];
  currentUserId: string | null;
}) {
  return (
    <ul className="flex flex-wrap items-center gap-2">
      {users.map((u) => (
        <li
          key={u.socketId}
          title={u.name}
          className="flex items-center gap-2 rounded-full bg-surface-raised py-1 pl-1 pr-3"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-brand-fg"
            style={{ backgroundColor: colorForName(u.userId) }}
            aria-hidden
          >
            {u.name.slice(0, 2).toUpperCase()}
          </span>
          <span className="text-sm">
            {u.name}
            {u.userId === currentUserId && <span className="text-text-muted"> (você)</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}
