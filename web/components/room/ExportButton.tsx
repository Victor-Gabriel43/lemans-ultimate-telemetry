"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { SERVER_URL } from "@/lib/socket";

export function ExportButton({ inviteCode }: { inviteCode: string }) {
  const [open, setOpen] = useState(false);
  const base = `${SERVER_URL}/rooms/${inviteCode}/export`;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex min-h-9 cursor-pointer items-center gap-2 border border-border bg-surface px-3 py-1.5 text-xs uppercase tracking-wide text-text-muted transition-colors hover:border-brand hover:text-text focus:border-brand focus:outline-none"
        title="Exportar dados da corrida"
      >
        <Download size={15} aria-hidden />
        <span>Export</span>
      </button>

      {open && (
        <>
          {/* fecha o menu ao clicar fora, sem precisar de lib extra */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <div className="absolute right-0 z-20 mt-1 flex w-56 flex-col overflow-hidden border border-border bg-surface shadow-lg">
            <a
              href={`${base}?format=json`}
              className="px-3 py-2.5 text-sm transition-colors hover:bg-surface-raised"
              onClick={() => setOpen(false)}
            >
              JSON completo da sala
            </a>
            <a
              href={`${base}?format=csv`}
              className="border-t border-border px-3 py-2.5 text-sm transition-colors hover:bg-surface-raised"
              onClick={() => setOpen(false)}
            >
              CSV da escala de pilotos
            </a>
          </div>
        </>
      )}
    </div>
  );
}
