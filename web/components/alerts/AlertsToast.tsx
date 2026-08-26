"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, OctagonAlert, X } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { computeActiveAlerts } from "@/lib/alertsEngine";

const AUTO_DISMISS_MS = 8000;

/**
 * Toasts de alerta — fixos por cima de qualquer página dentro da sala (o
 * layout renderiza isso uma vez só, ver app/room/[code]/layout.tsx).
 *
 * Sem persistência/socket dedicado: os alertas são recalculados a cada tick
 * a partir do MESMO snapshot que já está sincronizado pra sala inteira, então
 * todo mundo vê os mesmos alertas de forma independente (ver
 * lib/alertsEngine.ts pro racional). Dispensa é só local pra esta aba —
 * críticos exigem clique, os demais somem sozinhos depois de alguns segundos.
 */
export function AlertsToast() {
  const snapshot = useRoomStore((s) => s.snapshot);
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [shownAt, setShownAt] = useState<Map<string, number>>(new Map());
  const [lastActiveKeys, setLastActiveKeys] = useState("");

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const active = snapshot ? computeActiveAlerts(snapshot, now) : [];
  const activeKeys = active.map((a) => `${a.key}:${a.severity}`).join("|");

  // Registra "quando cada alerta apareceu pela primeira vez" ajustando o
  // estado direto no corpo do componente (padrão oficial do React pra
  // derivar estado quando algo muda, sem useEffect — ver
  // https://react.dev/learn/you-might-not-need-an-effect). O `if` guarda
  // contra loop infinito: só roda de novo quando o conjunto de chaves ativas
  // realmente muda.
  if (activeKeys !== lastActiveKeys) {
    setLastActiveKeys(activeKeys);
    const next = new Map(shownAt);
    let changed = false;
    for (const composite of activeKeys ? activeKeys.split("|") : []) {
      if (!next.has(composite)) {
        next.set(composite, now);
        changed = true;
      }
    }
    if (changed) setShownAt(next);
  }

  if (!snapshot) return null;

  const visible = active.filter((a) => {
    const composite = `${a.key}:${a.severity}`;
    if (dismissed.has(composite)) return false;
    const firstSeen = shownAt.get(composite) ?? now;
    if (a.severity !== "CRITICAL" && now - firstSeen > AUTO_DISMISS_MS) return false;
    return true;
  });

  function dismiss(key: string, severity: string) {
    setDismissed((prev) => new Set(prev).add(`${key}:${severity}`));
  }

  if (visible.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex flex-col items-center gap-2 p-3 sm:inset-x-auto sm:right-3 sm:items-end">
      {visible.map((a) => (
        <div
          key={`${a.key}:${a.severity}`}
          className={`pointer-events-auto flex w-full max-w-md items-start gap-2 rounded-md border px-3 py-2.5 shadow-lg backdrop-blur ${
            a.severity === "CRITICAL"
              ? "border-status-critical/50 bg-bg/95 text-status-critical"
              : "border-status-warning/50 bg-bg/95 text-status-warning"
          }`}
        >
          {a.severity === "CRITICAL" ? (
            <OctagonAlert size={18} className="mt-0.5 shrink-0" aria-hidden />
          ) : (
            <AlertTriangle size={18} className="mt-0.5 shrink-0" aria-hidden />
          )}
          <p className="flex-1 text-sm text-text">{a.message}</p>
          <button
            type="button"
            onClick={() => dismiss(a.key, a.severity)}
            aria-label="Dispensar alerta"
            className="cursor-pointer text-text-muted transition-colors hover:text-text"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
