"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SERVER_URL } from "@/lib/socket";
import { useRoomStore } from "@/state/roomStore";
import { primaryButton, fieldInput } from "@/components/ui/Panel";
import { StrategyTrace } from "@/components/home/StrategyTrace";
import { SystemPip } from "@/components/home/SystemPip";

type Mode = "create" | "join";

const DURATION_HOURS = [1, 2, 4, 6, 8, 12, 24];

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);

  // Voltar pra Home = sair de qualquer sala: limpa o estado do store pra que
  // um snapshot antigo nunca seja reaproveitado ao entrar noutra sala.
  useEffect(() => {
    useRoomStore.getState().reset();
  }, []);

  return (
    <main className="relative flex min-h-svh flex-1 flex-col overflow-hidden bg-bg text-text">
      <div
        aria-hidden
        className="raceops-grid raceops-grid-drift pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          ["--raceops-grid-opacity" as string]: "0.045",
        }}
      />
      {/* HALO azul respirando atrás do wordmark */}
      <div
        aria-hidden
        className="raceops-halo pointer-events-none absolute left-1/2 top-[-12%] h-[520px] w-[min(860px,120vw)] -translate-x-1/2 blur-[130px]"
        style={{
          background:
            "radial-gradient(closest-side, rgba(46,155,255,0.26), rgba(46,155,255,0.06) 60%, transparent)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 60% at 12% 20%, rgba(46,155,255,0.07), transparent 55%), linear-gradient(to bottom, transparent 58%, rgba(0,0,0,0.55))",
        }}
      />

      {/* TOP HAIRLINE STRIP */}
      <header className="relative z-10 mx-auto flex w-full max-w-[1280px] items-center justify-between gap-4 border-b border-border/70 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-4">
          <span className="font-mono text-xs tracking-[0.18em]">
            RACEOPS<span className="text-text-dim">&nbsp;/&nbsp;001</span>
          </span>
          <span className="hidden h-3.5 w-px bg-border sm:block" />
          <span className="eyebrow hidden sm:block">Endurance Operations</span>
        </div>
        <SystemPip />
      </header>

      {/* CONTENT */}
      <div className="relative z-10 mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-between gap-10 px-4 py-10 sm:px-6 sm:py-14">
        {/* HERO */}
        <section className="raceops-reveal flex flex-col" style={{ animationDelay: "0.05s" }}>
          <div className="mb-4 flex items-center gap-3">
            <span aria-hidden className="h-8 w-[3px] shrink-0 bg-brand" />
            <span className="eyebrow">Race Operations Center</span>
          </div>
          <span className="raceops-wipe block w-fit">
            <h1 className="raceops-sheen font-sans font-bold leading-[0.85] tracking-[-0.03em] text-[clamp(3rem,10vw,8rem)]">
              RACEOPS
            </h1>
          </span>
          <div className="mt-6 h-px w-full max-w-[460px] bg-linear-to-r from-brand/70 via-border to-transparent" />
          <p className="mt-4 font-mono text-xs tracking-[0.32em] text-text-muted sm:text-[0.8rem]">
            REAL-TIME ENDURANCE RACE CONTROL
          </p>
          <p className="mt-3 text-base text-text-dim sm:text-lg">Every decision. One place.</p>

          <ul className="mt-7 flex flex-wrap gap-2">
            {[
              "Live sync — sem F5",
              "Sem login",
              "Combustível · pneus · danos",
              "Escala de pilotos",
              "Pit planner",
            ].map((tag) => (
              <li
                key={tag}
                className="border border-border bg-surface/40 px-2.5 py-1 font-mono text-[0.65rem] uppercase tracking-[0.12em] text-text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        </section>

        {/* HERO VIZ */}
        <section className="raceops-reveal flex flex-col gap-2.5" style={{ animationDelay: "0.28s" }}>
          <div className="flex items-center justify-between">
            <span className="eyebrow">Strategy Trace — Session 001</span>
            <span className="eyebrow hidden sm:block">Scale · 04:00:00</span>
          </div>
          <div className="raceops-corners relative overflow-hidden border border-border bg-surface/30 p-3 sm:p-4">
            <StrategyTrace className="h-[132px] w-full sm:h-[176px] lg:h-[200px]" />
            <div
              aria-hidden
              className="raceops-scan pointer-events-none absolute inset-x-0 h-12 -translate-y-full border-b border-brand/60 bg-linear-to-b from-transparent via-brand/10 to-brand/25"
            />
          </div>
        </section>

        {/* ENTRIES / FORMS */}
        <section className="raceops-reveal" style={{ animationDelay: "0.4s" }}>
          {mode === null && (
            <div className="grid gap-4 sm:grid-cols-2">
              <RoomEntry
                index="01"
                title="Create Race Room"
                sub="Start New Race Operation"
                cta="Nova operação"
                primary
                onClick={() => setMode("create")}
              />
              <RoomEntry
                index="02"
                title="Join Race Room"
                sub="Enter Team Code"
                cta="Entrar com código"
                onClick={() => setMode("join")}
              />
            </div>
          )}

          {mode === "create" && (
            <div className="flex justify-center">
              <CreateRoomForm onBack={() => setMode(null)} onCreated={(code) => router.push(`/room/${code}`)} />
            </div>
          )}

          {mode === "join" && (
            <div className="flex justify-center">
              <JoinRoomForm onBack={() => setMode(null)} onJoin={(code) => router.push(`/room/${code}`)} />
            </div>
          )}
        </section>

        {/* BOTTOM HAIRLINE */}
        <footer
          className="raceops-reveal flex items-center justify-between gap-4 border-t border-border/70 pt-4"
          style={{ animationDelay: "0.5s" }}
        >
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            <span className="eyebrow">Pit Wall</span>
            <span className="eyebrow hidden sm:inline">Live Collaboration</span>
            <span className="eyebrow">Race Control</span>
          </div>
          <span className="eyebrow">Le Mans Ultimate</span>
        </footer>
      </div>
    </main>
  );
}

function RoomEntry({
  index,
  title,
  sub,
  cta,
  onClick,
  primary = false,
}: {
  index: string;
  title: string;
  sub: string;
  cta: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`raceops-corners group relative flex min-h-[176px] cursor-pointer flex-col justify-between overflow-hidden border p-6 text-left transition-colors focus:outline-none sm:p-7 ${
        primary
          ? "border-brand/50 bg-brand/[0.06] hover:border-brand hover:bg-brand/[0.1] focus-visible:border-brand"
          : "border-border bg-surface/50 hover:border-border-strong hover:bg-surface focus-visible:border-brand"
      }`}
    >
      {/* barra de acento que "carrega" no hover */}
      <span
        aria-hidden
        className="absolute left-0 top-0 h-full w-[3px] origin-top scale-y-0 bg-brand transition-transform duration-300 ease-out group-hover:scale-y-100 group-focus-visible:scale-y-100"
      />
      {/* brilho de canto no hover */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 bg-brand/20 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-100"
      />
      <div className="relative flex items-start justify-between">
        <span className="font-mono text-3xl font-semibold leading-none tracking-tight text-text-dim transition-colors group-hover:text-brand sm:text-4xl">
          {index}
        </span>
        <ArrowRight
          size={22}
          className="mt-1 text-text-dim transition-transform duration-300 group-hover:translate-x-1 group-hover:text-brand"
          aria-hidden
        />
      </div>
      <div className="relative flex flex-col gap-1.5">
        <span className="text-xl font-semibold tracking-[-0.01em] sm:text-2xl">{title}</span>
        <span className="eyebrow">{sub}</span>
        <span className="mt-3 flex items-center gap-1.5 font-mono text-[0.7rem] uppercase tracking-[0.14em] text-text-dim transition-colors group-hover:text-brand">
          {cta}
          <ArrowRight size={12} aria-hidden />
        </span>
      </div>
    </button>
  );
}

function FormShell({
  index,
  heading,
  onBack,
  children,
  onSubmit,
}: {
  index: string;
  heading: string;
  onBack: () => void;
  children: React.ReactNode;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="flex w-full max-w-lg flex-col gap-6 border border-border bg-surface/70 p-6 sm:p-8">
      <button
        type="button"
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1.5 self-start font-mono text-[0.7rem] uppercase tracking-[0.14em] text-text-muted transition-colors hover:text-text"
      >
        <ArrowLeft size={13} aria-hidden />
        Back
      </button>
      <div className="flex items-baseline gap-3 border-b border-border pb-4">
        <span className="font-mono text-xs tracking-[0.1em] text-text-dim">{index}</span>
        <h2 className="font-mono text-sm font-semibold uppercase tracking-[0.12em]">{heading}</h2>
      </div>
      {children}
    </form>
  );
}

function CreateRoomForm({ onBack, onCreated }: { onBack: () => void; onCreated: (code: string) => void }) {
  const [name, setName] = useState("");
  const [car, setCar] = useState("");
  const [track, setTrack] = useState("");
  const [durationMode, setDurationMode] = useState<"HOURS" | "LAPS">("HOURS");
  const [hours, setHours] = useState("6");
  const [laps, setLaps] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // O backend continua recebendo o mesmo contrato: TIME = minutos, LAPS = voltas.
      // A conversão de horas → minutos é só de UX, aqui no frontend.
      const raceDurationType = durationMode === "HOURS" ? "TIME" : "LAPS";
      const raceDurationValue =
        durationMode === "HOURS" ? Math.round(Number(hours) * 60) : Math.round(Number(laps));

      const res = await fetch(`${SERVER_URL}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          car,
          track: track || undefined,
          raceDurationType,
          raceDurationValue,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Não foi possível criar a sala.");
      }
      const data = await res.json();
      onCreated(data.inviteCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <FormShell index="01" heading="Start New Race Operation" onBack={onBack} onSubmit={handleSubmit}>
      <Field label="Race Name">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="24h de Le Mans"
          className={`${fieldInput} w-full`}
        />
      </Field>
      <Field label="Car">
        <input
          required
          value={car}
          onChange={(e) => setCar(e.target.value)}
          placeholder="Porsche 963 LMDh"
          className={`${fieldInput} w-full`}
        />
      </Field>
      <Field label="Track">
        <input
          value={track}
          onChange={(e) => setTrack(e.target.value)}
          placeholder="Circuit de la Sarthe"
          className={`${fieldInput} w-full`}
        />
      </Field>

      <Field label="Race Duration">
        <div className="flex flex-wrap items-stretch gap-2">
          <div className="flex border border-border">
            {(["HOURS", "LAPS"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setDurationMode(m)}
                className={`cursor-pointer px-3 py-2 font-mono text-[0.7rem] uppercase tracking-[0.14em] transition-colors ${
                  durationMode === m ? "bg-brand text-brand-fg" : "text-text-muted hover:text-text"
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {durationMode === "HOURS" ? (
            <select
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className={`${fieldInput} flex-1 cursor-pointer`}
              aria-label="Duração da corrida em horas"
            >
              {DURATION_HOURS.map((h) => (
                <option key={h} value={h}>
                  {h} {h === 1 ? "hour" : "hours"}
                </option>
              ))}
            </select>
          ) : (
            <input
              required
              type="number"
              min={1}
              value={laps}
              onChange={(e) => setLaps(e.target.value)}
              className={`${fieldInput} w-28`}
              aria-label="Duração da corrida em voltas"
            />
          )}
        </div>
        <span className="mt-1.5 font-mono text-[0.65rem] text-text-dim">
          {durationMode === "HOURS"
            ? `≈ ${Math.round(Number(hours) * 60)} min`
            : `${Math.round(Number(laps))} voltas`}
        </span>
      </Field>

      {error && <p className="text-sm text-status-critical">{error}</p>}
      <button type="submit" disabled={loading} className={primaryButton}>
        {loading ? "Creating…" : "Create Race"}
      </button>
    </FormShell>
  );
}

function JoinRoomForm({ onBack, onJoin }: { onBack: () => void; onJoin: (code: string) => void }) {
  const [code, setCode] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    onJoin(code.trim().toUpperCase());
  }

  return (
    <FormShell index="02" heading="Enter Team Code" onBack={onBack} onSubmit={handleSubmit}>
      <Field label="Invite Code">
        <input
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className={`${fieldInput} w-full text-center font-mono text-2xl tracking-[0.4em]`}
          maxLength={6}
        />
      </Field>
      <button type="submit" className={primaryButton}>
        Enter Race Room
      </button>
    </FormShell>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}
