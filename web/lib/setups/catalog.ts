// Modelo do catálogo de setups: tipos do JSON descriptografado, agrupamento
// em cartões (carro + pista + versão) e filtros sincronizados com o hash da URL.

export const CLASSES = ["HYPERCAR", "LMP2", "LMP3", "LMGT3"] as const;

export type Setup = {
  classe: string;
  carro: string;
  pista: string;
  temporada: string;
  versao: string;
  sessao: string;
  arquivo: string;
  conteudo: string;
};

export type SetupData = { gerado_em: string; setups: Setup[] };

export type SetupGroup = {
  id: string;
  classe: string;
  carro: string;
  pista: string;
  temporada: string;
  versao: string;
  setups: Setup[];
};

export type Filters = { classe: string; carro: string; pista: string; busca: string };

export const ALL = "";
export const EMPTY_FILTERS: Filters = { classe: ALL, carro: ALL, pista: ALL, busca: "" };

/** Ordem fixa das sessões no cartão: quali (C/E/W) e depois corrida. */
export const QUALI = ["CQ", "EQ", "WQ"];
export const RACE = ["CR", "ER", "WR"];

function compareVersionDesc(a: string, b: string) {
  const pa = a.split(".").map(Number);
  const pb = b.split(".").map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pb[i] ?? 0) - (pa[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

export function groupSetups(setups: Setup[]): SetupGroup[] {
  const map = new Map<string, SetupGroup>();
  for (const s of setups) {
    const id = [s.classe, s.carro, s.pista, s.temporada, s.versao].join("|");
    let g = map.get(id);
    if (!g) {
      g = { id, classe: s.classe, carro: s.carro, pista: s.pista, temporada: s.temporada, versao: s.versao, setups: [] };
      map.set(id, g);
    }
    g.setups.push(s);
  }
  const classOrder = (c: string) => CLASSES.indexOf(c as (typeof CLASSES)[number]);
  return [...map.values()].sort(
    (a, b) =>
      classOrder(a.classe) - classOrder(b.classe) ||
      a.carro.localeCompare(b.carro) ||
      a.pista.localeCompare(b.pista) ||
      compareVersionDesc(a.versao, b.versao) ||
      b.temporada.localeCompare(a.temporada),
  );
}

export type CarSummary = {
  classe: string;
  carro: string;
  pistas: string[];
  conjuntos: number;
  setups: number;
  versao: string;
};

/** Um item por carro pra Garagem, na mesma ordem de groupSetups (classe, nome). */
export function summarizeCars(groups: SetupGroup[]): CarSummary[] {
  const map = new Map<string, CarSummary>();
  for (const g of groups) {
    let c = map.get(g.carro);
    if (!c) {
      c = { classe: g.classe, carro: g.carro, pistas: [], conjuntos: 0, setups: 0, versao: "" };
      map.set(g.carro, c);
    }
    if (!c.pistas.includes(g.pista)) c.pistas.push(g.pista);
    c.conjuntos += 1;
    c.setups += g.setups.length;
    if (g.versao && compareVersionDesc(g.versao, c.versao || "0") < 0) c.versao = g.versao;
  }
  return [...map.values()];
}

function matches(g: SetupGroup, f: Filters, ignore?: keyof Filters) {
  if (ignore !== "classe" && f.classe && g.classe !== f.classe) return false;
  if (ignore !== "carro" && f.carro && g.carro !== f.carro) return false;
  if (ignore !== "pista" && f.pista && g.pista !== f.pista) return false;
  const q = f.busca.trim().toLowerCase();
  if (q && !`${g.carro} ${g.pista}`.toLowerCase().includes(q)) return false;
  return true;
}

export function filterGroups(groups: SetupGroup[], f: Filters) {
  return groups.filter((g) => matches(g, f));
}

/** Opções de um select considerando os outros filtros ativos (só combinações que existem). */
export function optionsFor(groups: SetupGroup[], f: Filters, field: "carro" | "pista") {
  return [...new Set(groups.filter((g) => matches(g, f, field)).map((g) => g[field]))].sort((a, b) =>
    a.localeCompare(b),
  );
}

/** "#HYPERCAR/Ferrari%20499P/Spa" → filtros. Valor inexistente cai pra "Todos". */
export function filtersFromHash(hash: string, groups: SetupGroup[]): Filters {
  const [classe = "", carro = "", pista = ""] = hash
    .replace(/^#/, "")
    .split("/")
    .map((p) => {
      try {
        return decodeURIComponent(p);
      } catch {
        return "";
      }
    });
  const has = (field: "classe" | "carro" | "pista", v: string) => !!v && groups.some((g) => g[field] === v);
  return {
    classe: has("classe", classe) ? classe : ALL,
    carro: has("carro", carro) ? carro : ALL,
    pista: has("pista", pista) ? pista : ALL,
    busca: "",
  };
}

export function hashFromFilters(f: Filters) {
  const parts = [f.classe, f.carro, f.pista];
  while (parts.length && !parts.at(-1)) parts.pop();
  return parts.length ? `#${parts.map(encodeURIComponent).join("/")}` : "";
}
