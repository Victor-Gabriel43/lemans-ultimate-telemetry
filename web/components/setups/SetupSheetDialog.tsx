"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { QUALI, RACE, type SetupGroup } from "@/lib/setups/catalog";
import { CORNER_LABELS, parseSheet } from "@/lib/setups/sheet";

/**
 * Ficha de valores de um conjunto (carro + pista + versão): uma aba por
 * sessão (CQ…WR) com os ajustes como o jogo mostra no garage, pra digitar à
 * mão quando não dá pra copiar o .svm (ex. GeForce NOW).
 */
export function SetupSheetDialog({ group, onClose }: { group: SetupGroup; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const sessions = [...QUALI, ...RACE].filter((code) => group.setups.some((s) => s.sessao === code));
  const [session, setSession] = useState(sessions[0]);
  const setup = group.setups.find((s) => s.sessao === session)!;
  const sheet = useMemo(() => parseSheet(setup.conteudo), [setup]);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && ref.current?.close()}
      className="m-auto max-h-[92vh] w-[min(1000px,96vw)] max-w-none border border-border bg-surface p-0 text-text backdrop:bg-black/70"
      aria-label={`Valores do setup ${group.carro} ${group.pista}`}
    >
      <div className="flex max-h-[92vh] flex-col">
        <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="eyebrow">Ficha do setup · digite no garage</p>
            <h2 className="mt-1.5 truncate text-lg font-semibold">
              {group.carro} <span className="text-text-dim">·</span> {group.pista}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-text-muted">
              {[group.temporada, group.versao && `HYMO ${group.versao}`, setup.arquivo].filter(Boolean).join(" · ")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="flex min-h-9 min-w-9 cursor-pointer items-center justify-center border border-border text-text-muted transition-colors hover:border-brand hover:text-text"
            aria-label="Fechar"
          >
            <X size={16} aria-hidden />
          </button>
        </header>

        <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2.5" role="tablist" aria-label="Sessão">
          {sessions.map((code) => (
            <button
              key={code}
              type="button"
              role="tab"
              aria-selected={code === session}
              onClick={() => setSession(code)}
              className={`min-h-9 cursor-pointer border px-3 py-1.5 font-mono text-xs transition-colors ${
                code === session ? "border-brand bg-brand/10 text-text" : "border-border text-text-muted hover:text-text"
              }`}
            >
              {code}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <section className="flex flex-col gap-2">
            <h3 className="eyebrow">Pneus e suspensão por roda</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse font-mono text-xs tabular-nums">
                <thead>
                  <tr className="text-left text-text-muted">
                    <th className="border-b border-border py-1.5 pr-3 font-normal">Ajuste</th>
                    {CORNER_LABELS.map((c) => (
                      <th key={c} className="border-b border-border px-2 py-1.5 font-normal">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sheet.corners.rows.map((r) => (
                    <tr key={r.label} className="hover:bg-surface-raised">
                      <td className="border-b border-border/60 py-1.5 pr-3 font-sans text-text-muted">{r.label}</td>
                      {r.values.map((v, i) => (
                        <td key={i} className="border-b border-border/60 px-2 py-1.5">
                          {v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            {sheet.sections.map((sec) => (
              <section key={sec.title} className="flex min-w-0 flex-col gap-1.5">
                <h3 className="eyebrow">{sec.title}</h3>
                <dl className="flex flex-col">
                  {sec.rows.map((r) => (
                    <div
                      key={r.label}
                      className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 hover:bg-surface-raised"
                    >
                      <dt className="min-w-0 text-sm text-text-muted">{r.label}</dt>
                      <dd className="shrink-0 font-mono text-xs tabular-nums">{r.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </div>
      </div>
    </dialog>
  );
}
