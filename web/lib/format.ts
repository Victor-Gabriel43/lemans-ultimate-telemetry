/** HH:MM:SS (omite HH se for zero) — usado pro relógio de corrida decorrida/restante. */
export function formatClock(totalSeconds: number): string {
  const sign = totalSeconds < 0 ? "-" : "";
  const abs = Math.abs(Math.round(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${sign}${h > 0 ? `${h}:` : ""}${pad(m)}:${pad(s)}`;
}

/** m:ss.mmm — tempo de volta. */
export function formatLapTime(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}

/** 90 -> "1h30min", 45 -> "45min" */
export function formatMinutes(totalMinutes: number): string {
  const abs = Math.round(Math.abs(totalMinutes));
  const sign = totalMinutes < 0 ? "-" : "";
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h === 0) return `${sign}${m}min`;
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}h${String(m).padStart(2, "0")}min`;
}

export function formatGap(seconds: number | null | undefined): string {
  if (seconds == null || !Number.isFinite(seconds)) return "—";
  const sign = seconds > 0 ? "+" : "";
  return `${sign}${seconds.toFixed(1)}s`;
}
