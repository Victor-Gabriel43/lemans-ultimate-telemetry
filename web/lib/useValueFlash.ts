"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Dispara um flash sutil (classe `raceops-flash`) sempre que `value` muda —
 * usado pra sinalizar que outro membro da equipe atualizou algo em tempo
 * real. Puramente visual: não altera dado nem lógica de socket.
 *
 * Uso: `const flash = useValueFlash(fuel.remaining);` → `<div className={flash}>`
 */
export function useValueFlash(value: unknown): string {
  const previous = useRef(value);
  const [flashing, setFlashing] = useState(false);

  useEffect(() => {
    if (Object.is(previous.current, value)) return;
    previous.current = value;
    setFlashing(true);
    const id = setTimeout(() => setFlashing(false), 900);
    return () => clearTimeout(id);
  }, [value]);

  return flashing ? "raceops-flash" : "";
}
