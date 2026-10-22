// Identidade visual por carro na Garagem: marca + cor de acento.
// A cor só é usada como acento (faixa, brilho, cantos) — texto continua
// branco/muted, então contraste não depende dela.

type Brand = { marca: string; cor: string };

const BY_MAKE: Record<string, string> = {
  Ferrari: "#e10600",
  BMW: "#1c69d4",
  "Aston Martin": "#00a07a",
  Cadillac: "#c8a24a",
  Peugeot: "#9bd13b",
  Toyota: "#eb0a1e",
  Alpine: "#1f6bff",
  Porsche: "#d5001c",
  Genesis: "#b9875a",
  Lamborghini: "#ddb321",
  Oreca: "#2e9bff",
  ADESS: "#a259ff",
  Ligier: "#0091ea",
  Ginetta: "#ff5a36",
  Corvette: "#f2c200",
  Ford: "#2f6fff",
  Lexus: "#8e9aaf",
  "Mercedes-AMG": "#00a19b",
};

export function brandOf(carro: string): Brand {
  const marca = Object.keys(BY_MAKE).find((m) => carro.startsWith(m)) ?? carro.split(" ")[0];
  return { marca, cor: BY_MAKE[marca] ?? "#2e9bff" };
}

/** Nome do modelo sem a marca ("Ferrari 499P" → "499P"). */
export function modelOf(carro: string) {
  const { marca } = brandOf(carro);
  return carro.startsWith(marca) ? carro.slice(marca.length).trim() || carro : carro;
}

/** Sobrescreve --brand localmente: tudo que usa bg-brand/border-brand/raceops-corners herda a cor da marca. */
export function brandStyle(carro: string) {
  return { "--brand": brandOf(carro).cor } as React.CSSProperties;
}
