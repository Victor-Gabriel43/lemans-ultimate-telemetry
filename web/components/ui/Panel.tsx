import type { ReactNode } from "react";

/**
 * Painel base do RACEOPS — moldura de "pit wall": borda fina, cantos retos,
 * cabeçalho com label técnico em caixa alta e uma faixa opcional de ações.
 * Todos os blocos do dashboard usam isto pra manter a grade consistente.
 */
export function Panel({
  title,
  icon,
  actions,
  children,
  className = "",
  bodyClassName = "",
}: {
  title: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    // `min-w-0` é essencial aqui: como item de grid/flex, sem isso o painel
    // recusa encolher abaixo do conteúdo mais largo do cabeçalho (ex. status
    // "CONNECTION FAILED"), estourando a coluna e cortando controles (como o
    // toggle da Telemetry) na borda da tela em viewports estreitos.
    <section className={`flex min-w-0 flex-col border border-border bg-surface ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-border px-3.5 py-2.5">
        <h2 className="eyebrow flex min-w-0 items-center gap-2 truncate">
          {icon}
          {title}
        </h2>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className={`flex min-w-0 flex-1 flex-col gap-4 p-3.5 ${bodyClassName}`}>{children}</div>
    </section>
  );
}

type Tone = "default" | "ok" | "warning" | "critical" | "brand";

const TONE_TEXT: Record<Tone, string> = {
  default: "text-text",
  ok: "text-status-ok",
  warning: "text-status-warning",
  critical: "text-status-critical",
  brand: "text-brand",
};

/**
 * Número/telemetria em destaque: label técnico em cima, valor grande em
 * monospace com `tabular-nums`. `size="lg"` para os KPIs que precisam ser
 * lidos em 2 segundos (combustível restante, posição, tempo restante).
 */
export function Metric({
  label,
  value,
  unit,
  tone = "default",
  size = "md",
  hint,
  className = "",
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  tone?: Tone;
  size?: "sm" | "md" | "lg";
  hint?: ReactNode;
  className?: string;
}) {
  const sizeClass = size === "lg" ? "text-[2rem]" : size === "sm" ? "text-base" : "text-xl";
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <span className="eyebrow">{label}</span>
      <span className={`font-mono font-medium leading-none tabular-nums ${sizeClass} ${TONE_TEXT[tone]}`}>
        {value}
        {unit ? <span className="ml-1 text-[0.55em] font-normal text-text-muted">{unit}</span> : null}
      </span>
      {hint ? <span className="text-xs text-text-muted">{hint}</span> : null}
    </div>
  );
}

const DOT_TONE: Record<Tone, string> = {
  default: "bg-text-muted",
  ok: "bg-status-ok",
  warning: "bg-status-warning",
  critical: "bg-status-critical",
  brand: "bg-brand",
};

export function StatusDot({ tone = "default", pulse = false }: { tone?: Tone; pulse?: boolean }) {
  return (
    <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
      {pulse && (
        <span
          className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${DOT_TONE[tone]}`}
        />
      )}
      <span className={`relative inline-flex h-2 w-2 rounded-full ${DOT_TONE[tone]}`} />
    </span>
  );
}

/** Botão primário grande — ação crítica de operação (iniciar corrida, pit stop). */
export const primaryButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-brand bg-brand px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-brand-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

/** Botão secundário — ação neutra / cancelar. */
export const ghostButton =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 border border-border bg-transparent px-4 py-2.5 text-sm font-medium uppercase tracking-wide text-text-muted transition-colors hover:border-border-strong hover:text-text disabled:cursor-not-allowed disabled:opacity-40";

/** Campo de formulário compacto e denso. */
export const fieldInput =
  "border border-border bg-surface-raised px-2.5 py-2 text-sm text-text tabular-nums placeholder:text-text-dim focus:border-brand focus:outline-none";
