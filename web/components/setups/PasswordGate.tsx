"use client";

import { useEffect, useRef, useState } from "react";
import { Lock } from "lucide-react";
import { fieldInput, primaryButton } from "@/components/ui/Panel";

export function PasswordGate({
  busy,
  error,
  attempt,
  onSubmit,
}: {
  busy: boolean;
  error?: string;
  /** incrementa a cada tentativa falha — mesma mensagem duas vezes ainda precisa limpar o campo */
  attempt: number;
  onSubmit: (password: string, remember: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const input = useRef<HTMLInputElement>(null);

  // senha errada: limpa e devolve o foco pro campo
  useEffect(() => {
    if (!attempt) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassword("");
    input.current?.focus();
  }, [attempt]);

  return (
    <form
      className="raceops-corners m-auto flex w-full max-w-sm flex-col gap-4 border border-border bg-surface p-6"
      onSubmit={(e) => {
        e.preventDefault();
        // tolera colar a linha inteira do .env.setups.local ou espaços sobrando
        // (o build também faz trim na senha)
        const clean = password.trim().replace(/^LMU_SENHA=/, "").trim();
        if (clean) onSubmit(clean, remember);
      }}
    >
      <div className="flex items-center gap-2">
        <Lock size={15} className="text-brand" aria-hidden />
        <h1 className="eyebrow">Acesso restrito</h1>
      </div>
      <p className="text-sm text-text-muted">Digite a senha do grupo para abrir o catálogo de setups.</p>

      <label className="flex flex-col gap-1.5">
        <span className="eyebrow">Senha</span>
        <input
          ref={input}
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`${fieldInput} min-h-11`}
          aria-invalid={!!error}
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-status-critical">
          {error}
        </p>
      )}

      <label className="flex cursor-pointer items-center gap-2 text-sm text-text-muted">
        <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="accent-brand" />
        Lembrar neste aparelho
      </label>

      <button type="submit" disabled={busy || !password} className={primaryButton}>
        {busy ? "Abrindo…" : "Entrar"}
      </button>
    </form>
  );
}
