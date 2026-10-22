"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import {
  cryptoSupported,
  decryptData,
  deriveKey,
  fetchEncrypted,
  forgetKey,
  FormatError,
  loadSavedKey,
  saveKey,
  WrongPasswordError,
} from "@/lib/setups/crypto";
import type { SetupData } from "@/lib/setups/catalog";
import { PasswordGate } from "@/components/setups/PasswordGate";
import { SetupCatalog } from "@/components/setups/SetupCatalog";
import { ghostButton } from "@/components/ui/Panel";

type Phase =
  | { kind: "loading" }
  | { kind: "locked"; error?: string; attempt?: number }
  | { kind: "unlocked"; data: SetupData }
  | { kind: "failed"; message: string; retry: boolean };

export default function SetupsPage() {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [busy, setBusy] = useState(false);
  const encrypted = useRef<Uint8Array | null>(null);

  const load = useCallback(async () => {
    if (!cryptoSupported()) {
      setPhase({ kind: "failed", message: "Este navegador não suporta a descriptografia usada pelo catálogo.", retry: false });
      return;
    }
    setPhase({ kind: "loading" });
    try {
      const data = await fetchEncrypted();
      encrypted.current = data;
      const saved = await loadSavedKey(data);
      if (saved) {
        try {
          setPhase({ kind: "unlocked", data: await decryptData(data, saved) });
          return;
        } catch {
          forgetKey();
        }
      }
      setPhase({ kind: "locked" });
    } catch (err) {
      setPhase(
        err instanceof FormatError
          ? { kind: "failed", message: "Versão de dados incompatível — recarregue a página.", retry: true }
          : { kind: "failed", message: "Falha ao carregar os dados.", retry: true },
      );
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function unlock(password: string, remember: boolean) {
    const data = encrypted.current;
    if (!data) return;
    setBusy(true);
    try {
      const key = await deriveKey(password, data);
      const decrypted = await decryptData(data, key);
      if (remember) await saveKey(key, data);
      setPhase({ kind: "unlocked", data: decrypted });
    } catch (err) {
      setPhase((p) => ({
        kind: "locked",
        error: err instanceof WrongPasswordError ? "Senha incorreta" : "Erro ao abrir os dados",
        attempt: (p.kind === "locked" ? (p.attempt ?? 0) : 0) + 1,
      }));
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    forgetKey();
    setPhase({ kind: "locked" });
  }

  return (
    <main className="flex min-h-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-text-muted transition-colors hover:text-text" title="Voltar">
            <ArrowLeft size={16} aria-hidden />
            <span className="font-mono text-sm font-semibold tracking-[0.18em] text-text">RACEOPS</span>
          </Link>
          <span className="h-3.5 w-px bg-border" />
          <span className="eyebrow">Setup Library</span>
        </div>
        {phase.kind === "unlocked" && (
          <button type="button" onClick={logout} className={`${ghostButton} min-h-9 px-3 py-1.5 text-xs`}>
            Sair
          </button>
        )}
      </header>

      <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col px-4 py-6 sm:px-6">
        {phase.kind === "loading" && <p className="eyebrow m-auto">Carregando…</p>}
        {phase.kind === "locked" && <PasswordGate busy={busy} error={phase.error} attempt={phase.attempt ?? 0} onSubmit={unlock} />}
        {phase.kind === "failed" && (
          <div className="m-auto flex flex-col items-center gap-4 text-center">
            <p className="text-status-critical">{phase.message}</p>
            {phase.retry && (
              <button type="button" onClick={() => void load()} className={ghostButton}>
                Tentar de novo
              </button>
            )}
          </div>
        )}
        {phase.kind === "unlocked" && <SetupCatalog data={phase.data} />}
      </div>
    </main>
  );
}
