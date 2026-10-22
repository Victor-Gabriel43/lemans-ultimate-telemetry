import type { RoomSnapshot } from "@lmu/shared";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * CSV da escala final — com BOM UTF-8 no início pra Excel abrir acentos
 * corretamente (sem o BOM, "ã"/"ç" viram lixo em Excel no Windows).
 */
export function buildScheduleCsv(snapshot: RoomSnapshot): string {
  const header = [
    "Ordem",
    "Horário/Volta",
    "Piloto",
    "Status",
    "Duração (min)",
    "Observações",
    "Editado por",
    "Atualizado em",
  ];

  const rows = snapshot.scheduleRows.map((row, i) => {
    const driver = snapshot.drivers.find((d) => d.id === row.driverId);
    const editor = snapshot.members.find((m) => m.userId === row.updatedBy)?.name ?? row.updatedBy;
    return [
      String(i + 1),
      row.plannedLabel,
      driver?.name ?? "",
      row.status,
      String(row.durationMinutes),
      row.notes,
      editor,
      row.updatedAt,
    ];
  });

  const lines = [header, ...rows].map((cols) => cols.map(csvEscape).join(","));
  const UTF8_BOM = String.fromCharCode(0xfeff);
  return UTF8_BOM + lines.join("\r\n");
}
