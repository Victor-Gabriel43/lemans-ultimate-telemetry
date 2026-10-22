/**
 * Cliente best-effort da REST API local da LMU (http://localhost:6397).
 * Ver docs/telemetry-api.md na raiz do repo pro racional completo — resumo:
 *
 * - Só funciona no navegador de quem está com o jogo aberto na própria
 *   máquina (fetch de localhost). Pode falhar por CORS, mixed content
 *   (HTTPS -> HTTP), jogo fechado, ou porque o endpoint mudou — QUALQUER
 *   falha aqui deve ser silenciosa pro resto da sala, nunca travar nada.
 * - `/rest/strategy/usage` é o único endpoint com nome confirmado pela
 *   comunidade pra combustível/energia — a FORMA exata do JSON não foi
 *   validada com o jogo rodando, então o parser tenta várias chaves
 *   candidatas em vez de assumir uma. Se um dia alguém confirmar o schema
 *   real via `http://localhost:6397/swagger/index.html`, ajustar
 *   `FUEL_REMAINING_KEYS`/`FUEL_USED_KEYS` abaixo em vez de reescrever tudo.
 * - Endpoint de scoring ao vivo (posição/volta/tempos) NÃO tem nome
 *   confirmado — não fabricamos uma URL aqui. Ver PASSO_A_PASSO.md.
 */

const HOSTS = ["localhost", "127.0.0.1"];
const PORT = 6397;
const FETCH_TIMEOUT_MS = 1500;

async function fetchJsonFromAnyHost(path: string): Promise<unknown | null> {
  for (const host of HOSTS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(`http://${host}:${PORT}${path}`, { signal: controller.signal, cache: "no-store" });
      if (!res.ok) continue;
      return await res.json();
    } catch {
      // mixed-content, CORS, jogo fechado, timeout do AbortController — tenta o
      // próximo host; qualquer falha aqui é silenciosa (nunca trava a sala).
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

export interface FuelTelemetryResult {
  litersRemaining?: number;
}

const FUEL_REMAINING_KEYS = ["fuelRemaining", "virtualEnergyRemaining", "energyRemaining", "remaining", "fuelLevel"];

/**
 * Parsing totalmente defensivo: nenhum campo é assumido presente, qualquer
 * formato inesperado só resulta em `{}` (nunca lança erro pra cima).
 */
export function parseFuelUsage(raw: unknown): FuelTelemetryResult {
  const result: FuelTelemetryResult = {};
  try {
    if (!raw || typeof raw !== "object") return result;

    const candidates: Record<string, unknown>[] = [];
    if (Array.isArray(raw)) {
      const last = raw.at(-1);
      if (last && typeof last === "object") candidates.push(last as Record<string, unknown>);
    } else {
      const obj = raw as Record<string, unknown>;
      candidates.push(obj);
      for (const arrayKey of ["history", "laps", "usage"]) {
        const arr = obj[arrayKey];
        if (Array.isArray(arr)) {
          const last = arr.at(-1);
          if (last && typeof last === "object") candidates.push(last as Record<string, unknown>);
        }
      }
    }

    for (const src of candidates) {
      for (const key of FUEL_REMAINING_KEYS) {
        const value = src[key];
        if (typeof value === "number" && Number.isFinite(value) && result.litersRemaining == null) {
          result.litersRemaining = value;
        }
      }
    }
  } catch {
    // parsing tolerante — retorna o que já tinha (possivelmente vazio)
  }
  return result;
}

export type TelemetryStatus = "connecting" | "connected" | "error";

/**
 * NUNCA rejeita nem trava: qualquer falha vira `{ status: "error", fuel: {} }`.
 * O caller (TelemetryToggle) usa isso pra sair de "connecting" — sem isto, um
 * throw inesperado deixava a UI presa eternamente em "CONNECTING".
 */
export async function pollFuelTelemetry(): Promise<{ status: TelemetryStatus; fuel: FuelTelemetryResult }> {
  try {
    const raw = await fetchJsonFromAnyHost("/rest/strategy/usage");
    if (raw == null) return { status: "error", fuel: {} };
    return { status: "connected", fuel: parseFuelUsage(raw) };
  } catch {
    return { status: "error", fuel: {} };
  }
}
