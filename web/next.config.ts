import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lmu/shared"],
  // "standalone" gera .next/standalone com um server.js mínimo + só os
  // node_modules realmente usados (tree-shaken) — é o que faz a imagem
  // Docker do web ficar pequena em vez de carregar o node_modules inteiro.
  // Só faz sentido pro build via Dockerfile — na Vercel (que define VERCEL=1
  // automaticamente) essa opção conflita com o empacotamento dela e quebra o build.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
};

export default nextConfig;
