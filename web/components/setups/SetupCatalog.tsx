"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, FolderArchive, Search } from "lucide-react";
import {
  ALL,
  CLASSES,
  EMPTY_FILTERS,
  filterGroups,
  filtersFromHash,
  groupSetups,
  hashFromFilters,
  optionsFor,
  QUALI,
  RACE,
  type Filters,
  type SetupData,
  type SetupGroup,
} from "@/lib/setups/catalog";
import { downloadGroup, downloadSetup } from "@/lib/setups/download";
import { fieldInput } from "@/components/ui/Panel";

const chip =
  "min-h-9 cursor-pointer border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors focus:outline-none focus-visible:border-brand";

export function SetupCatalog({ data }: { data: SetupData }) {
  const groups = useMemo(() => groupSetups(data.setups), [data]);
  const [filters, setFilters] = useState<Filters>(() =>
    typeof window === "undefined" ? EMPTY_FILTERS : filtersFromHash(window.location.hash, groups),
  );

  // filtros → hash (link direto pro grupo), sem empilhar histórico
  useEffect(() => {
    const hash = hashFromFilters(filters);
    if (hash !== window.location.hash) history.replaceState(null, "", hash || window.location.pathname);
  }, [filters]);

  // hash editado na mão / link colado com a página aberta
  useEffect(() => {
    const onHash = () => setFilters(filtersFromHash(window.location.hash, groups));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [groups]);

  const visible = filterGroups(groups, filters);
  const carros = optionsFor(groups, filters, "carro");
  const pistas = optionsFor(groups, filters, "pista");
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 border border-border bg-surface p-3.5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Classe">
          {[ALL, ...CLASSES].map((c) => (
            <button
              key={c || "all"}
              type="button"
              aria-pressed={filters.classe === c}
              onClick={() => set({ classe: c, carro: ALL, pista: ALL })}
              className={`${chip} ${
                filters.classe === c
                  ? "border-brand bg-brand/10 text-text"
                  : "border-border text-text-muted hover:border-border-strong hover:text-text"
              }`}
            >
              {c || "Todas"}
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.2fr]">
          <Select label="Carro" value={filters.carro} options={carros} onChange={(carro) => set({ carro })} />
          <Select label="Pista" value={filters.pista} options={pistas} onChange={(pista) => set({ pista })} />
          <label className="flex flex-col gap-1.5">
            <span className="eyebrow">Busca</span>
            <span className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" aria-hidden />
              <input
                type="search"
                value={filters.busca}
                onChange={(e) => set({ busca: e.target.value })}
                placeholder="Carro ou pista…"
                className={`${fieldInput} min-h-11 w-full pl-8`}
              />
            </span>
          </label>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="eyebrow tabular">
          {visible.length} conjuntos · {visible.reduce((n, g) => n + g.setups.length, 0)} setups
        </span>
        {(filters.classe || filters.carro || filters.pista || filters.busca) && (
          <button type="button" onClick={() => setFilters(EMPTY_FILTERS)} className="eyebrow cursor-pointer hover:text-text">
            Limpar filtros
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <p className="py-16 text-center text-text-muted">Nenhum setup com esses filtros.</p>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((g) => (
            <GroupCard key={g.id} group={g} />
          ))}
        </ul>
      )}
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${fieldInput} min-h-11 cursor-pointer`}>
        <option value={ALL}>Todos</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function GroupCard({ group: g }: { group: SetupGroup }) {
  const [zipping, setZipping] = useState(false);
  const bySession = new Map(g.setups.map((s) => [s.sessao, s]));

  async function zip() {
    setZipping(true);
    try {
      await downloadGroup(g);
    } finally {
      setZipping(false);
    }
  }

  return (
    <li className="flex min-w-0 flex-col border border-border bg-surface">
      <header className="flex items-start justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <div className="min-w-0">
          <p className="eyebrow">{g.classe}</p>
          <h2 className="mt-1.5 truncate font-semibold">
            {g.carro} <span className="text-text-dim">·</span> {g.pista}
          </h2>
          <p className="mt-1 font-mono text-xs text-text-muted">
            {[g.temporada, g.versao && `HYMO ${g.versao}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void zip()}
          disabled={zipping}
          title="Baixar todos (.zip)"
          className="flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs uppercase tracking-wide text-text-muted transition-colors hover:border-brand hover:text-text disabled:opacity-40"
        >
          <FolderArchive size={14} aria-hidden />
          .zip
        </button>
      </header>

      <div className="flex flex-col gap-2 p-3.5">
        {[
          ["Quali", QUALI],
          ["Corrida", RACE],
        ].map(([label, sessions]) => (
          <div key={label as string} className="flex items-center gap-2">
            <span className="eyebrow w-16 shrink-0">{label}</span>
            <div className="flex flex-wrap gap-1.5">
              {(sessions as string[]).map((code) => {
                const s = bySession.get(code);
                return s ? (
                  <button
                    key={code}
                    type="button"
                    onClick={() => downloadSetup(s)}
                    title={`Baixar ${s.arquivo}`}
                    className="flex min-h-9 cursor-pointer items-center gap-1.5 border border-border bg-surface-raised px-2.5 py-1.5 font-mono text-xs transition-colors hover:border-brand focus:outline-none focus-visible:border-brand"
                  >
                    <Download size={12} className="text-brand" aria-hidden />
                    {code}
                  </button>
                ) : (
                  <span key={code} className="min-h-9 px-2.5 py-1.5 font-mono text-xs text-text-dim">
                    {code}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        {/* o nome da pasta no jogo varia por pista (ex. "Lemans"), por isso não é montado aqui */}
        <p className="mt-1 truncate font-mono text-[0.68rem] text-text-dim" title="Pasta de destino no jogo">
          UserData\player\Settings\&lt;pasta da pista&gt;\
        </p>
      </div>
    </li>
  );
}
