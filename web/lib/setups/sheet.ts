// Ficha de valores de um .svm: transforma "Chave=bruto//exibido" nas linhas
// que o jogador vê no garage do LMU, pra digitar o setup à mão (ex. GeForce
// NOW, onde não dá pra copiar o arquivo). Só usa o texto depois de "//", que
// é o valor exatamente como o jogo mostra.

export type SheetRow = { label: string; value: string };
export type SheetSection = { title: string; rows: SheetRow[] };
export type CornerTable = { rows: { label: string; values: string[] }[] };
export type SetupSheet = { sections: SheetSection[]; corners: CornerTable };

const HIDDEN_VALUES = new Set(["N/A", "Non-adjustable", "Detached", ""]);
const SKIP_KEYS = new Set(["Notes", "Symmetric"]);

const SECTION_TITLES: Record<string, string> = {
  GENERAL: "Geral e combustível",
  FRONTWING: "Asa dianteira",
  REARWING: "Asa traseira",
  BODYAERO: "Radiadores e dutos",
  SUSPENSION: "Suspensão",
  CONTROLS: "Freios e eletrônica",
  ENGINE: "Motor e híbrido",
  DRIVELINE: "Câmbio e diferencial",
  LEFTFENDER: "Para-lama esquerdo",
  RIGHTFENDER: "Para-lama direito",
};
const SECTION_ORDER = Object.keys(SECTION_TITLES);

export const CORNERS = ["FRONTLEFT", "FRONTRIGHT", "REARLEFT", "REARRIGHT"] as const;
export const CORNER_LABELS = ["Diant. esq.", "Diant. dir.", "Tras. esq.", "Tras. dir."];

const LABELS: Record<string, string> = {
  Fuel: "Combustível",
  FuelCapacity: "Capacidade do tanque",
  VirtualEnergy: "Energia virtual",
  NumPitstops: "Nº de pit stops",
  FW: "Asa dianteira",
  RW: "Asa traseira",
  WaterRadiator: "Radiador de água",
  OilRadiator: "Radiador de óleo",
  BrakeDuct: "Duto de freio dianteiro",
  BrakeDuctRear: "Duto de freio traseiro",
  FrontAntiSway: "Barra estabilizadora dianteira",
  RearAntiSway: "Barra estabilizadora traseira",
  FrontToeIn: "Convergência dianteira",
  RearToeIn: "Convergência traseira",
  SteerLock: "Ângulo de esterço",
  RearBrake: "Balanço de freio",
  BrakeMigration: "Migração de freio",
  BrakePressure: "Pressão de freio",
  TC: "Controle de tração",
  ABS: "ABS",
  TractionControlMap: "TC (mapa)",
  TCPowerCutMap: "TC corte de potência",
  TCSlipAngleMap: "TC ângulo de deslize",
  AntilockBrakeSystemMap: "ABS (mapa)",
  RevLimit: "Limite de giro",
  EngineBoost: "Boost do motor",
  RegenerationMap: "Regeneração",
  ElectricMotorMap: "Motor elétrico",
  EngineMixture: "Mistura",
  EngineBrakingMap: "Freio motor",
  FinalDrive: "Relação final",
  Reverse: "Ré",
  RatioSet: "Conjunto de relações",
  DiffPower: "Diferencial (aceleração)",
  DiffCoast: "Diferencial (desaceleração)",
  DiffPreload: "Diferencial (pré-carga)",
  FrontDiffPower: "Dif. dianteiro (aceleração)",
  FrontDiffCoast: "Dif. dianteiro (desaceleração)",
  FrontDiffPreload: "Dif. dianteiro (pré-carga)",
  RearSplit: "Divisão de torque",
  GearAutoUpShift: "Troca automática (subida)",
  GearAutoDownShift: "Troca automática (descida)",
  Camber: "Cambagem",
  Pressure: "Pressão",
  Packer: "Packer",
  Spring: "Mola",
  TenderSpring: "Mola auxiliar",
  TenderTravel: "Curso da mola auxiliar",
  SpringRubber: "Batente",
  RideHeight: "Altura",
  SlowBump: "Bump lento",
  FastBump: "Bump rápido",
  SlowRebound: "Rebound lento",
  FastRebound: "Rebound rápido",
  BrakeDisc: "Disco de freio",
  BrakePad: "Pastilha",
  Compound: "Composto",
};

const THIRD: Record<string, string> = { Front3rd: "3º elemento dianteiro", Rear3rd: "3º elemento traseiro" };

function labelFor(key: string) {
  const base = key.replace(/Setting$/, "");
  const third = Object.keys(THIRD).find((p) => base.startsWith(p));
  if (third) return `${THIRD[third]}: ${(LABELS[base.slice(third.length)] ?? base.slice(third.length)).toLowerCase()}`;
  const gear = base.match(/^Gear(\d)$/);
  if (gear) return `Marcha ${gear[1]}`;
  const adj = base.match(/^ChassisAdj(\d+)$/);
  if (adj) return `Ajuste de chassi ${adj[1]}`;
  return LABELS[base] ?? base.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Lê o .svm e devolve as seções do garage com o valor exibido de cada ajuste. */
export function parseSheet(conteudo: string): SetupSheet {
  const raw = new Map<string, [string, string][]>();
  let section = "";
  for (const line of conteudo.split(/\r?\n/)) {
    const head = line.match(/^\[(.+)\]\s*$/);
    if (head) {
      section = head[1];
      raw.set(section, []);
      continue;
    }
    if (!section || line.startsWith("//")) continue;
    const m = line.match(/^([A-Za-z0-9]+)=([^/]*)(?:\/\/(.*))?$/);
    if (!m || SKIP_KEYS.has(m[1])) continue;
    raw.get(section)!.push([m[1], (m[3] ?? m[2]).trim()]);
  }

  const sections: SheetSection[] = [];
  for (const id of SECTION_ORDER) {
    const rows = (raw.get(id) ?? [])
      .filter(([, v]) => !HIDDEN_VALUES.has(v))
      .map(([k, v]) => ({ label: labelFor(k), value: v }));
    if (rows.length) sections.push({ title: SECTION_TITLES[id], rows });
  }

  // rodas: uma linha por ajuste, uma coluna por canto (como na tela do jogo)
  const keys: string[] = [];
  for (const c of CORNERS) for (const [k] of raw.get(c) ?? []) if (!keys.includes(k)) keys.push(k);
  const rows = keys
    .map((k) => ({
      label: labelFor(k),
      values: CORNERS.map((c) => (raw.get(c) ?? []).find(([kk]) => kk === k)?.[1] ?? ""),
    }))
    .filter((r) => r.values.some((v) => !HIDDEN_VALUES.has(v)));

  return { sections, corners: { rows } };
}
