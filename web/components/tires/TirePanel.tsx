"use client";

import { useState } from "react";
import { CircleDot } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { computeStintHistory, computeTireStats } from "@/lib/tireStats";
import { resolveMemberName } from "@/lib/members";
import { formatRelativeTime } from "@/lib/relativeTime";

const COMPOUNDS = ["Macio", "Médio", "Duro", "Chuva"];

export function TirePanel() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const startTireStint = useRoomStore((s) => s.startTireStint);
  const { tireLog, room, members } = snapshot;

  const [compound, setCompound] = useState(COMPOUNDS[0]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const stats = computeTireStats(tireLog, room.currentLap, room.settings);
  const history = computeStintHistory(tireLog, room.currentLap);

  const gripColor =
    stats.gripPercent < 65 ? "text-status-critical" : stats.gripPercent < 80 ? "text-status-warning" : "text-status-ok";

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <CircleDot size={14} aria-hidden />
        Pneus
      </h2>

      {stats.current ? (
        <div className="grid grid-cols-3 gap-3">
          <Stat label="Composto" value={stats.current.compound} />
          <Stat label="Idade" value={`${stats.ageLaps} voltas`} />
          <Stat label="Grip estimado" value={`${stats.gripPercent.toFixed(0)}%`} className={gripColor} />
        </div>
      ) : (
        <p className="text-sm text-text-muted">Nenhum pneu registrado ainda.</p>
      )}

      {stats.recommendChange && (
        <p className="rounded-md border border-status-critical/40 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
          Grip estimado baixo — recomenda-se trocar o jogo de pneus.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Composto novo
          <select
            value={compound}
            onChange={(e) => setCompound(e.target.value)}
            className="min-w-[110px] cursor-pointer rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {COMPOUNDS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => startTireStint(compound)}
          className="min-h-11 cursor-pointer rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg transition-opacity hover:opacity-90"
        >
          Trocar pneu
        </button>
      </div>

      {history.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="cursor-pointer text-sm text-text-muted transition-colors hover:text-text"
          >
            {historyOpen ? "Esconder" : "Ver"} histórico de stints ({history.length})
          </button>
          {historyOpen && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {[...history].reverse().map(({ entry, lapsRun }) => (
                <li key={entry.id} className="flex items-center justify-between text-sm">
                  <span>{entry.compound}</span>
                  <span className="text-text-muted">
                    volta {entry.stintStartLap} · {lapsRun} voltas · {resolveMemberName(members, entry.createdBy)} ·{" "}
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-text-muted">{label}</span>
      <span className={`font-mono text-lg tabular-nums ${className}`}>{value}</span>
    </div>
  );
}
