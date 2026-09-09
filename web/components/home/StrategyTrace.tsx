"use client";

import { useSyncExternalStore } from "react";

/**
 * Elemento "wow" da Home — visualização abstrata de estratégia de endurance.
 * Não representa uma pista real: é uma composição de racing line + timeline de
 * stints + janela de pit + traço de telemetria. Movimento muito sutil (um
 * cursor percorre a linha, o sinal "escorre", os nós de evento pulsam de leve)
 * — parece um sistema de engenharia ligado, não uma animação decorativa.
 *
 * 100% SVG + SMIL/CSS, sem dependência. Respeita `prefers-reduced-motion`:
 * nesse caso rende tudo estático.
 */
const TRACE_D =
  "M 0 118 C 120 96 180 60 300 70 S 460 128 560 112 S 720 52 840 64 S 1000 120 1120 92 S 1240 70 1300 84";

type EventNode = {
  x: number;
  y: number;
  label: string;
  time: string;
  accent?: boolean;
  ring?: boolean;
};

const NODES: EventNode[] = [
  { x: 48, y: 70, label: "STINT 01", time: "00:00" },
  { x: 300, y: 68, label: "FUEL", time: "00:42" },
  { x: 560, y: 110, label: "PIT", time: "01:30", accent: true },
  { x: 840, y: 62, label: "DRIVER", time: "02:15" },
  { x: 1080, y: 90, label: "TYRE", time: "03:00" },
  { x: 1272, y: 84, label: "LAP", time: "03:48", ring: true },
];

export function StrategyTrace({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();

  return (
    <svg
      viewBox="0 0 1300 210"
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label="Visualização abstrata de estratégia de corrida de endurance"
    >
      <defs>
        <linearGradient id="raceops-trace" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2e9bff" stopOpacity="0.12" />
          <stop offset="0.5" stopColor="#2e9bff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#2e9bff" stopOpacity="0.2" />
        </linearGradient>
        <path id="raceops-trace-path" d={TRACE_D} />
      </defs>

      {/* baseline + minor ticks */}
      <line x1="0" y1="150" x2="1300" y2="150" stroke="#26272c" strokeWidth="1" />
      <g stroke="#1c1d22" strokeWidth="1">
        {[0, 216, 432, 648, 864, 1080, 1300].map((x, i) => (
          <line key={x} x1={x} y1={i === 0 || i === 6 ? 34 : 140} x2={x} y2="160" />
        ))}
      </g>

      {/* pit window band */}
      <rect x="470" y="32" width="230" height="118" fill="#2e9bff" fillOpacity="0.05" />
      <line x1="470" y1="32" x2="470" y2="150" stroke="#2e9bff" strokeOpacity="0.3" strokeDasharray="2 3" />
      <line x1="700" y1="32" x2="700" y2="150" stroke="#2e9bff" strokeOpacity="0.3" strokeDasharray="2 3" />
      <text
        x="472"
        y="24"
        fill="#2e9bff"
        fillOpacity="0.75"
        fontFamily="var(--font-plex-mono), monospace"
        fontSize="9"
        letterSpacing="2"
      >
        PIT WINDOW
      </text>

      {/* the trace */}
      <use href="#raceops-trace-path" fill="none" stroke="url(#raceops-trace)" strokeWidth="1.5" />

      {/* live "signal" overlay — marching dashes, very low contrast */}
      {!reduced && (
        <use
          href="#raceops-trace-path"
          fill="none"
          stroke="#2e9bff"
          strokeOpacity="0.5"
          strokeWidth="1.5"
          strokeDasharray="1 13"
          strokeLinecap="round"
        >
          <animate attributeName="stroke-dashoffset" from="0" to="-140" dur="3.2s" repeatCount="indefinite" />
        </use>
      )}

      {/* traveling cursor */}
      {!reduced && (
        <circle r="3.2" fill="#f4f4f5">
          <animateMotion dur="9s" repeatCount="indefinite" rotate="auto" keyPoints="0;1" keyTimes="0;1" calcMode="linear">
            <mpath href="#raceops-trace-path" />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.06;0.94;1" dur="9s" repeatCount="indefinite" />
        </circle>
      )}

      {/* event nodes */}
      <g fontFamily="var(--font-plex-mono), monospace" fontSize="9" letterSpacing="1.4">
        {NODES.map((n, i) => (
          <g key={n.label}>
            <line x1={n.x + 3.5} y1={n.y + 7} x2={n.x + 3.5} y2="150" stroke={n.accent ? "#2e9bff" : "#3a3c44"} strokeOpacity={n.accent ? 0.4 : 1} />
            {n.ring ? (
              <circle cx={n.x + 3.5} cy={n.y + 3.5} r="4" fill="none" stroke="#f4f4f5" strokeWidth="1.2" />
            ) : (
              <rect x={n.x} y={n.y} width="7" height="7" fill={n.accent ? "#2e9bff" : "#f4f4f5"} />
            )}
            {!reduced && (
              <rect x={n.x - 2.5} y={n.y - 2.5} width="12" height="12" fill="none" stroke={n.accent ? "#2e9bff" : "#f4f4f5"} strokeWidth="1">
                <animate attributeName="opacity" values="0;0.9;0" dur="9s" begin={`${(i / NODES.length) * 9}s`} repeatCount="indefinite" />
                <animate attributeName="width" values="12;22;12" dur="9s" begin={`${(i / NODES.length) * 9}s`} repeatCount="indefinite" />
                <animate attributeName="height" values="12;22;12" dur="9s" begin={`${(i / NODES.length) * 9}s`} repeatCount="indefinite" />
                <animate attributeName="x" values={`${n.x - 2.5};${n.x - 7.5};${n.x - 2.5}`} dur="9s" begin={`${(i / NODES.length) * 9}s`} repeatCount="indefinite" />
                <animate attributeName="y" values={`${n.y - 2.5};${n.y - 7.5};${n.y - 2.5}`} dur="9s" begin={`${(i / NODES.length) * 9}s`} repeatCount="indefinite" />
              </rect>
            )}
            <text x={n.x} y={n.y - 8} fill={n.accent ? "#2e9bff" : "#8b8d95"}>
              {n.label}
            </text>
            <text x={n.x} y="182" fill="#5b5d66">
              {n.time}
            </text>
          </g>
        ))}
      </g>
    </svg>
  );
}

const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_QUERY).matches,
    () => false
  );
}
