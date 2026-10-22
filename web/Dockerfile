# syntax=docker/dockerfile:1
#
# Usa o output "standalone" do Next.js — gera um server.js mínimo + só os
# node_modules realmente usados. Roda a partir da RAIZ do monorepo
# (`docker build -f web/Dockerfile .`), não de dentro de web/.
#
# IMPORTANTE: NEXT_PUBLIC_SERVER_URL é embutida no bundle client em BUILD
# TIME (padrão do Next.js pra variáveis NEXT_PUBLIC_*) — passar como build
# arg, não adianta só setar como env var do container em runtime (não tem
# efeito nenhum na parte que já rodou no navegador). Ver docker-compose.yml.

FROM node:22-alpine AS base
# Alpine (musl) não vem com OpenSSL — o postinstall do server ("prisma
# generate") dispara mesmo aqui (é um workspace) e precisa dele.
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY web/package.json web/package.json
# o postinstall do server ("prisma generate") dispara aqui mesmo builadando
# só o web, porque é um npm workspace — precisa do schema presente.
COPY server/prisma server/prisma
RUN npm ci

FROM deps AS build
COPY shared shared
COPY web web
ARG NEXT_PUBLIC_SERVER_URL
ENV NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
RUN npm run build --workspace=web

FROM base AS runtime
ENV NODE_ENV=production
# sem isso o server.js do Next standalone só escuta em localhost dentro do
# container, inacessível de fora mesmo com a porta publicada.
ENV HOSTNAME="0.0.0.0"
COPY --from=build /app/web/.next/standalone ./
COPY --from=build /app/web/.next/static ./web/.next/static
COPY --from=build /app/web/public ./web/public

EXPOSE 3000
CMD ["node", "web/server.js"]
