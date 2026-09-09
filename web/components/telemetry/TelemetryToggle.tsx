"use client";

import { useEffect, useRef, useState } from "react";
import { Radio } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { pollFuelTelemetry } from "@/lib/telemetry/lmuClient";
import { Panel, StatusDot } from "@/components/ui/Panel";

const POLL_INTERVAL_MS = 2500;
const FIRST_ATTEMPT_TIMEOUT_MS = 8000;

type Phase = "off" | "connecting" | "connected" | "failed";
type PollResult = "connected" | "failed";

/**
 * Telemetria local (OPCIONAL). Best-effort: só faz sentido pra quem está com o
 * jogo aberto na própria máquina. Ligar/desligar é escolha local desta aba; os
 * DADOS lidos é que se propagam pra todos via `fuel:log` (source TELEMETRY).
 *
 * Nunca fica presa em "connecting":
 *  - `off`        → toggle desligado (padrão)
 *  - `connecting` → habilitado, ainda sem primeiro resultado (teto de 8s)
 *  - `connected`  → última leitura OK
 *  - `failed`     → última leitura falhou (segue tentando em background;
 *                    pode voltar sozinho pra `connected`)
 */
export function TelemetryToggle() {
  const [enabled, setEnabled] = useState(false);
  const [result, setResult] = useState<PollResult | null>(null);
  const logFuel = useRoomStore((s) => s.logFuel);
  const gotFirstResult = useRef(false);

  const phase: Phase = !enabled ? "off" : (result ?? "connecting");

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    gotFirstResult.current = false;

    // Teto de segurança: se a primeira tentativa não respondeu em 8s
    // (rede pendurada, etc), marca "failed" — nunca fica preso em connecting.
    const guard = setTimeout(() => {
      if (!cancelled && !gotFirstResult.current) setResult("failed");
    }, FIRST_ATTEMPT_TIMEOUT_MS);

    async function tick() {
      let poll: Awaited<ReturnType<typeof pollFuelTelemetry>>;
      try {
        poll = await pollFuelTelemetry();
      } catch {
        poll = { status: "error", fuel: {} };
      }
      if (cancelled) return;
      gotFirstResult.current = true;

      if (poll.status === "connected") {
        setResult("connected");
        if (poll.fuel.litersRemaining != null) {
          const currentLap = useRoomStore.getState().snapshot?.room.currentLap ?? 0;
          logFuel({ lap: currentLap, litersUsed: null, litersRemaining: poll.fuel.litersRemaining }, "TELEMETRY");
        }
      } else {
        setResult("failed");
      }
    }

    void tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(guard);
      clearInterval(interval);
    };
  }, [enabled, logFuel]);

  const meta = {
    off: { tone: "default" as const, label: "TELEMETRY OFFLINE" },
    connecting: { tone: "warning" as const, label: "CONNECTING…" },
    connected: { tone: "ok" as const, label: "CONNECTED" },
    failed: { tone: "critical" as const, label: "CONNECTION FAILED" },
  }[phase];

  return (
    <Panel
      title="Telemetry"
      icon={<Radio size={13} aria-hidden />}
      className="lg:col-span-4"
      actions={
        <span className="flex items-center gap-1.5 text-xs font-medium">
          <StatusDot tone={meta.tone} pulse={phase === "connected" || phase === "connecting"} />
          {meta.label}
        </span>
      }
    >
      <div className="flex items-center justify-between gap-3">
        <span className="min-w-0 text-sm">Conectar telemetria local</span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Conectar telemetria local"
          onClick={() => {
            setEnabled((v) => !v);
            setResult(null);
          }}
          className={`relative h-6 w-11 shrink-0 grow-0 cursor-pointer border transition-colors ${
            enabled ? "border-brand bg-brand" : "border-border bg-surface-raised"
          }`}
        >
          <span
            className={`absolute top-1 h-4 w-4 transition-transform ${
              enabled ? "translate-x-6 bg-brand-fg" : "translate-x-1 bg-text-muted"
            }`}
          />
        </button>
      </div>

      <p className="font-mono text-[0.65rem] text-text-dim">localhost:6397 · leitura de combustível do jogo</p>

      <TelemetryHint phase={phase} />
    </Panel>
  );
}

function TelemetryHint({ phase }: { phase: Phase }) {
  if (phase === "connected") {
    return <p className="text-xs text-status-ok">Conectado — combustível vindo direto do jogo.</p>;
  }
  if (phase === "connecting") {
    return <p className="text-xs text-text-muted">Procurando o jogo na máquina local…</p>;
  }
  if (phase === "failed") {
    return (
      <p className="text-xs text-text-muted">
        Não conectou. Confirme que o jogo está aberto numa sessão nesta máquina. Se o navegador bloquear por
        conteúdo não seguro, libere nas configurações do site. A sala continua 100% utilizável no modo manual —
        segue tentando reconectar em segundo plano.
      </p>
    );
  }
  return (
    <p className="text-xs text-text-muted">
      Desligada — a estratégia funciona normalmente no modo manual. Ligue só quem estiver no PC do jogo.
    </p>
  );
}
