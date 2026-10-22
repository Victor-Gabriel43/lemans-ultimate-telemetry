import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Setups — RACEOPS",
  description: "Catálogo privado de setups do Le Mans Ultimate.",
};

export default function SetupsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
