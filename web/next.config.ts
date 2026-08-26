import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@lmu/shared"],
  // "standalone" gera .next/standalone com um server.js mínimo + só os
  // node_modules realmente usados (tree-shaken) — é o que faz a imagem
  // Docker do web ficar pequena em vez de carregar o node_modules inteiro.
  output: "standalone",
};

export default nextConfig;
