"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SERVER_URL } from "@/lib/socket";

type Mode = "create" | "join";

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">LMU Race Engineer</h1>
        <p className="mt-2 text-text-muted">
          Painel de estratégia colaborativo para corridas de endurance.
        </p>
      </div>

      {mode === null && (
        <div className="grid w-full gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("create")}
            className="cursor-pointer rounded-lg border border-border bg-surface p-6 text-left transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <h2 className="text-lg font-semibold">Criar nova sala</h2>
            <p className="mt-1 text-sm text-text-muted">
              Configure a corrida e gere um código de convite pra sua equipe.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("join")}
            className="cursor-pointer rounded-lg border border-border bg-surface p-6 text-left transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <h2 className="text-lg font-semibold">Entrar em sala</h2>
            <p className="mt-1 text-sm text-text-muted">
              Já tem um código de convite? Entre na sala da sua equipe.
            </p>
          </button>
        </div>
      )}

      {mode === "create" && (
        <CreateRoomForm onBack={() => setMode(null)} onCreated={(code) => router.push(`/room/${code}`)} />
      )}

      {mode === "join" && (
        <JoinRoomForm onBack={() => setMode(null)} onJoin={(code) => router.push(`/room/${code}`)} />
      )}
    </main>
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="cursor-pointer self-start text-sm text-text-muted transition-colors hover:text-text"
    >
      ← Voltar
    </button>
  );
}

function CreateRoomForm({ onBack, onCreated }: { onBack: () => void; onCreated: (code: string) => void }) {
  const [name, setName] = useState("");
  const [car, setCar] = useState("");
  const [track, setTrack] = useState("");
  const [durationType, setDurationType] = useState<"TIME" | "LAPS">("TIME");
  const [durationValue, setDurationValue] = useState("60");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/rooms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          car,
          track: track || undefined,
          raceDurationType: durationType,
          raceDurationValue: Number(durationValue),
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <BackButton onBack={onBack} />
      <Field label="Nome da corrida">
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="24h de Le Mans"
          className={inputClass}
        />
      </Field>
      <Field label="Carro">
        <input
          required
          value={car}
          onChange={(e) => setCar(e.target.value)}
          placeholder="Porsche 963 LMDh"
          className={inputClass}
        />
      </Field>
      <Field label="Pista (opcional)">
        <input value={track} onChange={(e) => setTrack(e.target.value)} className={inputClass} />
      </Field>
      <div className="flex gap-3">
        <Field label="Duração por" className="flex-1">
          <select
            value={durationType}
            onChange={(e) => setDurationType(e.target.value as "TIME" | "LAPS")}
            className={inputClass}
          >
            <option value="TIME">Tempo (minutos)</option>
            <option value="LAPS">Voltas</option>
          </select>
        </Field>
        <Field label="Valor" className="flex-1">
          <input
            required
            type="number"
            min={1}
            value={durationValue}
            onChange={(e) => setDurationValue(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {error && <p className="text-sm text-status-critical">{error}</p>}
      <button type="submit" disabled={loading} className={primaryButtonClass}>
        {loading ? "Criando…" : "Criar sala"}
      </button>
    </form>
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
    <form onSubmit={handleSubmit} className="flex w-full max-w-md flex-col gap-4">
      <BackButton onBack={onBack} />
      <Field label="Código do convite">
        <input
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC123"
          className={`${inputClass} font-mono text-lg tracking-widest`}
          maxLength={6}
        />
      </Field>
      <button type="submit" className={primaryButtonClass}>
        Entrar na sala
      </button>
    </form>
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
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="text-text-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "w-full rounded-md border border-border bg-surface px-3 py-2.5 text-text placeholder:text-text-muted/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand";

const primaryButtonClass =
  "min-h-12 cursor-pointer rounded-md bg-brand px-4 py-3 font-medium text-brand-fg transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
