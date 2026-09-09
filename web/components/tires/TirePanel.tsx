"use client";

import { useState } from "react";
import { CircleDot } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { computeStintHistory, computeTireStats } from "@/lib/tireStats";
import { resolveMemberName } from "@/lib/members";
import { formatRelativeTime } from "@/lib/relativeTime";
import { Panel, Metric, fieldInput } from "@/components/ui/Panel";
import { useValueFlash } from "@/lib/useValueFlash";

const COMPOUNDS = ["Macio", "Médio", "Duro", "Chuva"];

export function TirePanel() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const startTireStint = useRoomStore((s) => s.startTireStint);
  const { tireLog, room, members } = snapshot;

  const [compound, setCompound] = useState(COMPOUNDS[0]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const stats = computeTireStats(tireLog, room.currentLap, room.settings);
  const history = computeStintHistory(tireLog, room.currentLap);
  const flash = useValueFlash(stats.current?.id ?? null);

  const tone =
    stats.gripPercent < 65 ? "critical" : stats.gripPercent < 80 ? "warning" : "ok";
  const barColor =
    tone === "critical" ? "bg-status-critical" : tone === "warning" ? "bg-status-warning" : "bg-brand";

  return (
    <Panel title="Tyres" icon={<CircleDot size={13} aria-hidden />} className="lg:col-span-4">
      {stats.current ? (
        <div className={`flex flex-col gap-3 ${flash}`}>
          <div className="grid grid-cols-3 gap-3">
            <Metric label="Composto" value={stats.current.compound} size="sm" />
            <Metric label="Idade" value={String(stats.ageLaps)} unit="v" size="sm" />
            <Metric label="Grip est." value={stats.gripPercent.toFixed(0)} unit="%" tone={tone} size="sm" />
          </div>
          <div className="h-1.5 w-full bg-surface-raised">
            <div className={`h-full ${barColor}`} style={{ width: `${Math.max(0, Math.min(100, stats.gripPercent))}%` }} />
          </div>
        </div>
      ) : (
        <p className="text-sm text-text-muted">Nenhum jogo de pneus registrado ainda.</p>
      )}

      {stats.recommendChange && (
        <p className="border border-status-critical/40 bg-status-critical/10 px-3 py-2 text-sm text-status-critical">
          Grip estimado baixo — recomenda-se trocar o jogo de pneus.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Composto novo</span>
          <select
            value={compound}
            onChange={(e) => setCompound(e.target.value)}
            className={`${fieldInput} min-w-[110px] cursor-pointer`}
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
          className="min-h-9 cursor-pointer border border-brand bg-brand px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-fg transition-opacity hover:opacity-90"
        >
          Trocar pneu
        </button>
      </div>

      {history.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="cursor-pointer text-xs uppercase tracking-wide text-text-muted transition-colors hover:text-text"
          >
            {historyOpen ? "Esconder" : "Ver"} histórico de stints ({history.length})
          </button>
          {historyOpen && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {[...history].reverse().map(({ entry, lapsRun }) => (
                <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-mono">{entry.compound}</span>
                  <span className="text-text-muted">
                    v{entry.stintStartLap} · {lapsRun}v · {resolveMemberName(members, entry.createdBy)} ·{" "}
                    {formatRelativeTime(entry.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Panel>
  );
}
