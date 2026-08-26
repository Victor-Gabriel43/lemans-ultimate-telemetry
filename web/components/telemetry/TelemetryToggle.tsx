"use client";

import { useEffect, useState } from "react";
import { Radio } from "lucide-react";
import { useRoomStore } from "@/state/roomStore";
import { pollFuelTelemetry, type TelemetryStatus } from "@/lib/telemetry/lmuClient";

const POLL_INTERVAL_MS = 2000;

/**
 * Best-effort: só faz sentido pra quem está no PC do jogo. Ligar/desligar é
 * uma escolha local desta aba (não sincronizada com a sala) — os DADOS que
 * ela consegue ler é que se propagam pra todo mundo via fuel:log normal
 * (mesmo caminho da Fase 8, só com source: "TELEMETRY").
 */
export function TelemetryToggle() {
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState<TelemetryStatus | "idle">("idle");
  const logFuel = useRoomStore((s) => s.logFuel);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function tick() {
      const { status: newStatus, fuel } = await pollFuelTelemetry();
      if (cancelled) return;
      setStatus(newStatus);
      if (newStatus === "connected" && fuel.litersRemaining != null) {
        const currentLap = useRoomStore.getState().snapshot?.room.currentLap ?? 0;
        logFuel({ lap: currentLap, litersUsed: null, litersRemaining: fuel.litersRemaining }, "TELEMETRY");
      }
    }

    void tick();
    const id = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [enabled, logFuel]);

  return (
    <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
      <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
        <Radio size={14} aria-hidden />
        Telemetria
      </h2>
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Conectar telemetria local"
          onClick={() => {
            setEnabled((v) => !v);
            setStatus("idle");
          }}
          className={`relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors ${
            enabled ? "bg-brand" : "bg-border"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-bg transition-transform ${
              enabled ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span className="text-sm">Conectar telemetria local</span>
      </div>
      <StatusLabel status={!enabled ? "idle" : status === "idle" ? "connecting" : status} />
    </section>
  );
}

function StatusLabel({ status }: { status: TelemetryStatus | "idle" }) {
  if (status === "connected") {
    return <p className="text-xs text-status-ok">Conectada em localhost:6397 — combustível vindo do jogo.</p>;
  }
  if (status === "connecting") {
    return <p className="text-xs text-text-muted">Conectando…</p>;
  }
  if (status === "error") {
    return (
      <p className="text-xs text-status-warning">
        Não conectou (localhost:6397). Confira se o jogo está aberto numa sessão. Se o navegador bloquear por
        &quot;conteúdo não seguro&quot;, permita isso nas configurações do site. A sala continua em modo manual
        enquanto isso.
      </p>
    );
  }
  return <p className="text-xs text-text-muted">Desligada — modo manual.</p>;
}
