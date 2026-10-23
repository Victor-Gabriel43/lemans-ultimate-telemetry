"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Download, FolderArchive, ListChecks, Search } from "lucide-react";
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
  summarizeCars,
  type CarSummary,
  type Filters,
  type SetupData,
  type SetupGroup,
} from "@/lib/setups/catalog";
import { brandOf, brandStyle, modelOf } from "@/lib/setups/brands";
import { downloadGroup, downloadSetup } from "@/lib/setups/download";
import { fieldInput } from "@/components/ui/Panel";
import { SetupSheetDialog } from "@/components/setups/SetupSheetDialog";

const chip =
  "min-h-9 cursor-pointer border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.12em] transition-colors focus:outline-none focus-visible:border-brand";
const chipOn = "border-brand bg-brand/10 text-text";
const chipOff = "border-border text-text-muted hover:border-border-strong hover:text-text";

/**
 * Setup Library em duas telas, ambas guiadas pelos filtros (e pelo hash):
 * sem carro escolhido → Garagem (um cartão por carro, com a cor da marca);
 * com carro → as pistas e os conjuntos de setups daquele carro.
 */
export function SetupCatalog({ data }: { data: SetupData }) {
  const groups = useMemo(() => groupSetups(data.setups), [data]);
  const [filters, setFilters] = useState<Filters>(() =>
    typeof window === "undefined" ? EMPTY_FILTERS : filtersFromHash(window.location.hash, groups),
  );

  // filtros → hash (link direto pro carro/pista), sem empilhar histórico
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

  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  if (filters.carro) {
    return (
      <CarView
        groups={groups}
        filters={filters}
        onPista={(pista) => set({ pista })}
        onBack={() => {
          set({ carro: ALL, pista: ALL });
          window.scrollTo({ top: 0 });
        }}
      />
    );
  }
  return (
    <Garage
      groups={groups}
      filters={filters}
      set={set}
      onOpen={(c) => {
        set({ classe: c.classe, carro: c.carro, pista: ALL, busca: "" });
        window.scrollTo({ top: 0 });
      }}
    />
  );
}

/* ------------------------------------------------------------------------ */
/* Garagem                                                                   */
/* ------------------------------------------------------------------------ */

function Garage({
  groups,
  filters,
  set,
  onOpen,
}: {
  groups: SetupGroup[];
  filters: Filters;
  set: (patch: Partial<Filters>) => void;
  onOpen: (c: CarSummary) => void;
}) {
  const q = filters.busca.trim().toLowerCase();
  const cars = summarizeCars(groups).filter(
    (c) =>
      (!filters.classe || c.classe === filters.classe) &&
      (!q || `${c.carro} ${brandOf(c.carro).marca} ${c.pistas.join(" ")}`.toLowerCase().includes(q)),
  );
  const sections = CLASSES.map((classe) => ({ classe, cars: cars.filter((c) => c.classe === classe) })).filter(
    (s) => s.cars.length,
  );

  return (
    <div className="flex flex-col gap-8">
      <section className="raceops-reveal flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-6 w-[3px] shrink-0 bg-brand" />
          <span className="eyebrow">Garage</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-[-0.02em] sm:text-4xl">Escolha o carro</h1>
        <p className="text-sm text-text-muted">
          {summarizeCars(groups).length} carros · {groups.reduce((n, g) => n + g.setups.length, 0)} setups
        </p>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Classe">
          {[ALL, ...CLASSES].map((c) => (
            <button
              key={c || "all"}
              type="button"
              aria-pressed={filters.classe === c}
              onClick={() => set({ classe: c })}
              className={`${chip} ${filters.classe === c ? chipOn : chipOff}`}
            >
              {c || "Todas"}
            </button>
          ))}
        </div>
        <label className="relative sm:w-72">
          <span className="sr-only">Buscar carro, marca ou pista</span>
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-dim" aria-hidden />
          <input
            type="search"
            value={filters.busca}
            onChange={(e) => set({ busca: e.target.value })}
            placeholder="Carro, marca ou pista…"
            className={`${fieldInput} min-h-11 w-full pl-8`}
          />
        </label>
      </div>

      {sections.length === 0 ? (
        <p className="py-16 text-center text-text-muted">Nenhum carro com esses filtros.</p>
      ) : (
        sections.map((s) => (
          <section key={s.classe} className="flex flex-col gap-3">
            <div className="flex items-center gap-3 border-b border-border pb-2">
              <h2 className="eyebrow text-text">{s.classe}</h2>
              <span className="eyebrow tabular text-text-dim">{s.cars.length} carros</span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {s.cars.map((c) => (
                <li key={c.carro}>
                  <CarCard car={c} onOpen={() => onOpen(c)} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}

function CarCard({ car, onOpen }: { car: CarSummary; onOpen: () => void }) {
  const { marca } = brandOf(car.carro);
  const model = modelOf(car.carro);
  const shown = car.pistas.slice(0, 5);

  return (
    <button
      type="button"
      onClick={onOpen}
      style={brandStyle(car.carro)}
      className="raceops-corners group relative flex h-full min-h-[208px] w-full cursor-pointer flex-col justify-between overflow-hidden border border-border bg-surface p-5 text-left transition-colors hover:border-brand/70 focus:outline-none focus-visible:border-brand"
    >
      {/* faixa da marca + brilho de fundo */}
      <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-brand" />
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand opacity-[0.13] blur-3xl transition-opacity duration-300 group-hover:opacity-25"
      />
      {/* modelo como marca d'água */}
      <span
        aria-hidden
        className="pointer-events-none absolute -bottom-3 right-2 select-none whitespace-nowrap font-mono text-[4.5rem] font-bold leading-none text-text opacity-[0.035]"
      >
        {model}
      </span>

      <div className="relative">
        <p className="eyebrow flex items-center gap-2">
          <span className="text-brand">{marca}</span>
          <span className="text-text-dim">·</span>
          {car.classe}
        </p>
        <h3 className="mt-2 text-2xl font-bold leading-tight tracking-[-0.01em]">{model}</h3>
        <p className="mt-2 font-mono text-xs text-text-muted tabular">
          {car.pistas.length} pistas · {car.setups} setups
          {car.versao && <span className="text-text-dim"> · HYMO {car.versao}</span>}
        </p>
      </div>

      <div className="relative mt-5 flex items-end justify-between gap-3">
        <ul className="flex min-w-0 flex-wrap gap-1">
          {shown.map((p) => (
            <li key={p} className="border border-border bg-bg/40 px-1.5 py-0.5 font-mono text-[0.62rem] uppercase text-text-muted">
              {p}
            </li>
          ))}
          {car.pistas.length > shown.length && (
            <li className="px-1 py-0.5 font-mono text-[0.62rem] text-text-dim">+{car.pistas.length - shown.length}</li>
          )}
        </ul>
        <ArrowRight
          size={18}
          aria-hidden
          className="shrink-0 text-text-dim transition-all duration-300 group-hover:translate-x-0.5 group-hover:text-brand"
        />
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------------ */
/* Carro                                                                     */
/* ------------------------------------------------------------------------ */

function CarView({
  groups,
  filters,
  onPista,
  onBack,
}: {
  groups: SetupGroup[];
  filters: Filters;
  onPista: (pista: string) => void;
  onBack: () => void;
}) {
  const carGroups = groups.filter((g) => g.carro === filters.carro);
  const car = summarizeCars(carGroups)[0];
  const { marca } = brandOf(filters.carro);
  const pistas = optionsFor(groups, { ...filters, busca: "" }, "pista");
  const visible = filterGroups(groups, { ...filters, classe: ALL, busca: "" });

  return (
    <div className="flex flex-col gap-5" style={brandStyle(filters.carro)}>
      <button
        type="button"
        onClick={onBack}
        className="eyebrow flex w-fit cursor-pointer items-center gap-1.5 py-1 transition-colors hover:text-text"
      >
        <ArrowLeft size={13} aria-hidden /> Garagem
      </button>

      <section className="relative overflow-hidden border border-border bg-surface p-5 sm:p-7">
        <span aria-hidden className="absolute left-0 top-0 h-full w-[3px] bg-brand" />
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-brand opacity-[0.16] blur-3xl"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute -bottom-5 right-4 select-none whitespace-nowrap font-mono text-[7rem] font-bold leading-none text-text opacity-[0.04] sm:text-[9rem]"
        >
          {modelOf(filters.carro)}
        </span>

        <div className="relative">
          <p className="eyebrow flex items-center gap-2">
            <span className="text-brand">{marca}</span>
            <span className="text-text-dim">·</span>
            {car?.classe}
          </p>
          <h1 className="mt-2 text-4xl font-bold leading-none tracking-[-0.02em] sm:text-5xl">{modelOf(filters.carro)}</h1>
          {car && (
            <p className="mt-3 font-mono text-xs text-text-muted tabular">
              {car.pistas.length} pistas · {car.conjuntos} conjuntos · {car.setups} setups
              {car.versao && <span className="text-text-dim"> · HYMO {car.versao}</span>}
            </p>
          )}

          <div className="mt-6 flex flex-wrap gap-1.5" role="group" aria-label="Pista">
            {[ALL, ...pistas].map((p) => (
              <button
                key={p || "all"}
                type="button"
                aria-pressed={filters.pista === p}
                onClick={() => onPista(p)}
                className={`${chip} ${filters.pista === p ? chipOn : `${chipOff} bg-bg/40`}`}
              >
                {p || "Todas as pistas"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <span className="eyebrow tabular">
        {visible.length} conjuntos · {visible.reduce((n, g) => n + g.setups.length, 0)} setups
      </span>

      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((g) => (
          <GroupCard key={g.id} group={g} />
        ))}
      </ul>
    </div>
  );
}

function GroupCard({ group: g }: { group: SetupGroup }) {
  const [zipping, setZipping] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
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
    <li className="flex min-w-0 flex-col border border-border bg-surface transition-colors hover:border-border-strong">
      <header className="flex items-start justify-between gap-3 border-b border-border px-3.5 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{g.pista}</h2>
          <p className="mt-1 font-mono text-xs text-text-muted">
            {[g.temporada, g.versao && `HYMO ${g.versao}`].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            onClick={() => setSheetOpen(true)}
            title="Ver os valores pra digitar no garage"
            className="flex min-h-9 cursor-pointer items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs uppercase tracking-wide text-text-muted transition-colors hover:border-brand hover:text-text"
          >
            <ListChecks size={14} aria-hidden />
            Valores
          </button>
          <button
            type="button"
            onClick={() => void zip()}
            disabled={zipping}
            title="Baixar todos (.zip)"
            className="flex min-h-9 cursor-pointer items-center gap-1.5 border border-border px-2.5 py-1.5 text-xs uppercase tracking-wide text-text-muted transition-colors hover:border-brand hover:text-text disabled:opacity-40"
          >
            <FolderArchive size={14} aria-hidden />
            .zip
          </button>
        </div>
      </header>
      {sheetOpen && <SetupSheetDialog group={g} onClose={() => setSheetOpen(false)} />}

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
