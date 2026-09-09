"use client";

import { useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { DamageSeverity } from "@lmu/shared";
import { useRoomStore } from "@/state/roomStore";
import { computeDamageStats } from "@/lib/damageStats";
import { resolveMemberName } from "@/lib/members";
import { formatRelativeTime } from "@/lib/relativeTime";
import { Panel, Metric, fieldInput } from "@/components/ui/Panel";
import { useValueFlash } from "@/lib/useValueFlash";

const CAR_PARTS = ["Aero dianteira", "Aero traseira", "Suspensão", "Freios", "Motor", "Câmbio", "Carroceria"];

const SEVERITY_LABEL: Record<DamageSeverity, string> = {
  LIGHT: "Leve",
  MODERATE: "Moderado",
  SEVERE: "Severo",
};

const SEVERITY_COLOR: Record<DamageSeverity, string> = {
  LIGHT: "text-status-warning border-status-warning/40 bg-status-warning/10",
  MODERATE: "text-status-warning border-status-warning/50 bg-status-warning/10",
  SEVERE: "text-status-critical border-status-critical/50 bg-status-critical/10",
};

export function DamagePanel() {
  const snapshot = useRoomStore((s) => s.snapshot)!;
  const logDamage = useRoomStore((s) => s.logDamage);
  const repairDamage = useRoomStore((s) => s.repairDamage);
  const { damageLog, room, members } = snapshot;

  const [part, setPart] = useState(CAR_PARTS[0]);
  const [severity, setSeverity] = useState<DamageSeverity>("LIGHT");
  const [historyOpen, setHistoryOpen] = useState(false);

  const stats = computeDamageStats(damageLog, room.settings);
  const flash = useValueFlash(stats.active.map((d) => d.id).join());

  return (
    <Panel title="Damage" icon={<TriangleAlert size={13} aria-hidden />} className="lg:col-span-4">
      <div className={`flex flex-col gap-3 ${flash}`}>
        {stats.active.length === 0 ? (
          <p className="flex items-center gap-1.5 text-sm text-status-ok">
            <CheckCircle2 size={14} aria-hidden />
            Carro sem danos ativos.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Metric label="Reparo estimado" value={String(stats.totalRepairMinutes)} unit="min" size="sm" tone="warning" />
              <Metric label="Impacto no ritmo" value={`~${stats.totalPaceImpactPercent}`} unit="%" size="sm" tone="warning" />
            </div>
            <ul className="flex flex-col gap-1.5">
              {stats.active.map((d) => (
                <li
                  key={d.id}
                  className={`flex items-center justify-between gap-2 border px-3 py-2 text-sm ${SEVERITY_COLOR[d.severity]}`}
                >
                  <span className="min-w-0 truncate">
                    {d.part} · {SEVERITY_LABEL[d.severity]}
                    {d.repairEstimateMinutes != null && (
                      <span className="opacity-80"> · {d.repairEstimateMinutes}min</span>
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => repairDamage(d.id)}
                    className="min-h-8 shrink-0 cursor-pointer border border-current px-2 py-1 text-[0.7rem] uppercase tracking-wide transition-opacity hover:opacity-80"
                  >
                    Reparado
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Parte</span>
          <select
            value={part}
            onChange={(e) => setPart(e.target.value)}
            className={`${fieldInput} min-w-[140px] cursor-pointer`}
          >
            {CAR_PARTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="eyebrow">Severidade</span>
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as DamageSeverity)}
            className={`${fieldInput} min-w-[110px] cursor-pointer`}
          >
            {(Object.keys(SEVERITY_LABEL) as DamageSeverity[]).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          onClick={() => logDamage(part, severity)}
          className="min-h-9 cursor-pointer border border-brand bg-brand px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-brand-fg transition-opacity hover:opacity-90"
        >
          Registrar dano
        </button>
      </div>

      {stats.repaired.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="cursor-pointer text-xs uppercase tracking-wide text-text-muted transition-colors hover:text-text"
          >
            {historyOpen ? "Esconder" : "Ver"} reparados ({stats.repaired.length})
          </button>
          {historyOpen && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {[...stats.repaired].reverse().map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-2 text-sm text-text-muted">
                  <span className="line-through">
                    {d.part} · {SEVERITY_LABEL[d.severity]}
                  </span>
                  <span>
                    {resolveMemberName(members, d.createdBy)} · {formatRelativeTime(d.createdAt)}
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
