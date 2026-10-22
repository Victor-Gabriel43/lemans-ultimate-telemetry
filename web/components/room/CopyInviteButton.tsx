"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyInviteButton({ inviteCode, reconnecting = false }: { inviteCode: string; reconnecting?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const url = `${window.location.origin}/room/${inviteCode}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex: contexto não seguro) — falha silenciosa, o código continua visível pra copiar na mão
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex min-h-9 cursor-pointer items-center gap-2 border border-border bg-surface px-3 py-1.5 transition-colors hover:border-brand hover:text-text focus:border-brand focus:outline-none"
      title={reconnecting ? "Reconectando…" : "Copiar link de convite"}
    >
      <span className="font-mono text-sm font-semibold tracking-[0.2em]">{inviteCode}</span>
      {copied ? (
        <Check size={15} className="text-status-ok" aria-hidden />
      ) : (
        <Copy size={15} className="text-text-muted" aria-hidden />
      )}
      <span className="sr-only">{copied ? "Link copiado" : "Copiar link de convite"}</span>
    </button>
  );
}
