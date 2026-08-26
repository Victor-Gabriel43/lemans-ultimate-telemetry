"use client";

import { useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import type { DamageSeverity } from "@lmu/shared";
import { useRoomStore } from "@/state/roomStore";
import { computeDamageStats } from "@/lib/damageStats";
import { resolveMemberName } from "@/lib/members";
import { formatRelativeTime } from "@/lib/relativeTime";

const CAR_PARTS = ["Aero dianteira", "Aero traseira", "Suspensão", "Freios", "Motor", "Câmbio", "Carroceria"];

const SEVERITY_LABEL: Record<DamageSeverity, string> = {
  LIGHT: "Leve",
  MODERATE: "Moderado",
  SEVERE: "Severo",
};

const SEVERITY_COLOR: Record<DamageSeverity, string> = {
  LIGHT: "text-status-ok border-status-ok/40 bg-status-ok/10",
  MODERATE: "text-status-warning border-status-warning/40 bg-status-warning/10",
  SEVERE: "text-status-critical border-status-critical/40 bg-status-critical/10",
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

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <TriangleAlert size={14} aria-hidden />
        Danos
      </h2>

      {stats.active.length === 0 ? (
        <p className="flex items-center gap-1.5 text-sm text-status-ok">
          <CheckCircle2 size={14} aria-hidden />
          Nenhum dano ativo.
        </p>
      ) : (
        <>
          <div className="flex gap-4 text-sm text-text-muted">
            <span>
              Reparo estimado:{" "}
              <span className="font-mono tabular-nums text-text">{stats.totalRepairMinutes}min</span>
            </span>
            <span>
              Impacto no ritmo:{" "}
              <span className="font-mono tabular-nums text-text">~{stats.totalPaceImpactPercent}%</span>
            </span>
          </div>
          <ul className="flex flex-col gap-1.5">
            {stats.active.map((d) => (
              <li
                key={d.id}
                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm ${SEVERITY_COLOR[d.severity]}`}
              >
                <span>
                  {d.part} · {SEVERITY_LABEL[d.severity]}
                  {d.repairEstimateMinutes != null && (
                    <span className="opacity-80"> · {d.repairEstimateMinutes}min</span>
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => repairDamage(d.id)}
                  className="min-h-11 cursor-pointer rounded-md border border-current px-3 py-1 text-xs transition-opacity hover:opacity-80"
                >
                  Marcar reparado
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Parte
          <select
            value={part}
            onChange={(e) => setPart(e.target.value)}
            className="min-w-[140px] cursor-pointer rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
          >
            {CAR_PARTS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-text-muted">
          Severidade
          <select
            value={severity}
            onChange={(e) => setSeverity(e.target.value as DamageSeverity)}
            className="min-w-[110px] cursor-pointer rounded-md border border-border bg-surface-raised px-2 py-1.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
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
          className="min-h-11 cursor-pointer rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-fg transition-opacity hover:opacity-90"
        >
          Registrar dano
        </button>
      </div>

      {stats.repaired.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((v) => !v)}
            className="cursor-pointer text-sm text-text-muted transition-colors hover:text-text"
          >
            {historyOpen ? "Esconder" : "Ver"} reparados ({stats.repaired.length})
          </button>
          {historyOpen && (
            <ul className="mt-2 flex flex-col gap-1.5">
              {[...stats.repaired].reverse().map((d) => (
                <li key={d.id} className="flex items-center justify-between text-sm text-text-muted line-through">
                  <span>
                    {d.part} · {SEVERITY_LABEL[d.severity]}
                  </span>
                  <span className="no-underline">
                    {resolveMemberName(members, d.createdBy)} · {formatRelativeTime(d.createdAt)}
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
