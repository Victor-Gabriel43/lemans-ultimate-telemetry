"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyInviteButton({ inviteCode }: { inviteCode: string }) {
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
      className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 transition-colors hover:bg-surface-raised focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      title="Copiar link de convite"
    >
      <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-status-ok" aria-hidden />
      <span className="font-mono text-sm tracking-widest">{inviteCode}</span>
      {copied ? (
        <Check size={16} className="text-status-ok" aria-hidden />
      ) : (
        <Copy size={16} className="text-text-muted" aria-hidden />
      )}
      <span className="sr-only">{copied ? "Link copiado" : "Copiar link de convite"}</span>
    </button>
  );
}
