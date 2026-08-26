# syntax=docker/dockerfile:1
#
# Multi-stage: instala tudo (com devDependencies) num estágio, builda com
# esbuild, e copia o node_modules INTEIRO pro estágio final — decisão
# consciente de simplicidade/corretude sobre tamanho mínimo de imagem (dá
# pra otimizar depois com --omit=dev separado, se algum dia importar).
#
# Roda a partir da RAIZ do monorepo (`docker build -f server/Dockerfile .`),
# não de dentro de server/ — precisa enxergar o workspace shared/.

FROM node:22-alpine AS base
# Alpine (musl) não vem com OpenSSL — os engines do Prisma precisam dele,
# senão caem num fallback e podem falhar silenciosamente em runtime.
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY web/package.json web/package.json
# o postinstall do server ("prisma generate") já dispara aqui — precisa do
# schema presente antes do `npm ci`, mesmo sem o resto do código fonte ainda.
COPY server/prisma server/prisma
RUN npm ci

FROM deps AS build
COPY shared shared
COPY server server
RUN npm run build --workspace=server

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/server ./server
COPY --from=build /app/shared ./shared

EXPOSE 4001
ENTRYPOINT ["./server/docker-entrypoint.sh"]
CMD ["node", "server/dist/index.js"]
