"use client";

import { useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { formatRelativeTime } from "@/lib/relativeTime";

/**
 * "editado por Fulano há 5s" — rastreabilidade sem bloquear edição de
 * ninguém (ver PASSO_A_PASSO.md, "todo mundo edita"). O tempo relativo
 * se atualiza sozinho a cada segundo enquanto o badge estiver montado.
 */
export function EditedByBadge({ name, at }: { name: string; at: string }) {
  const [, forceTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => forceTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <span className="inline-flex items-center gap-1 text-xs text-text-muted">
      <Pencil size={11} aria-hidden />
      {name} · {formatRelativeTime(at)}
    </span>
  );
}
