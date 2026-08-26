# LMU Race Engineer

Painel de estratégia colaborativo em tempo real para corridas de endurance no Le Mans Ultimate. Crie uma "sala de corrida", compartilhe o código de convite com a equipe, e todo mundo edita combustível, pneus, danos, pit stops e a escala de pilotos ao vivo — sem F5.

**Antes de mexer no código, leia `PASSO_A_PASSO.md`** — é o roadmap fase a fase de como o projeto foi construído, com as decisões técnicas e os porquês de cada uma. `docs/design-system.md` e `docs/telemetry-api.md` têm as decisões de UI e da integração com o jogo já pesquisadas — não redecidir sem motivo.

## Estrutura

```
shared/   tipos TypeScript + lógica compartilhada entre server e web (@lmu/shared)
server/   Express + Socket.IO + Prisma (tempo real e persistência)
web/      Next.js (App Router) — frontend
```

Banco: **Postgres** (único suportado — dev e produção; ver `PASSO_A_PASSO.md` pro porquê da troca de SQLite).

## Opção 1 — Tudo via Docker (mais simples)

```bash
docker compose up --build
```

Sobe Postgres + server + web já conectados entre si. `web` fica em [http://localhost:3000](http://localhost:3000), `server` em `http://localhost:4001`. As migrations do Prisma rodam sozinhas ao subir o container do `server` (não precisa fazer nada manual). Pra popular a sala de teste `DEV001`:

```bash
docker compose exec -w /app/server server npx tsx prisma/seed.ts
```

Parar tudo: `docker compose down` (ou `docker compose down -v` pra apagar os dados do Postgres também).

## Opção 2 — App local + Postgres no Docker (mais rápido pra desenvolver)

Só o banco containerizado; `server`/`web` rodam local com hot-reload de verdade.

```bash
docker compose up -d postgres    # só o banco, publicado em localhost:5433

npm install                      # na raiz — instala as 3 workspaces de uma vez
cp server/.env.example server/.env   # já aponta pro Postgres do compose

npx prisma migrate dev --schema=server/prisma/schema.prisma   # primeira vez só
npm run db:seed --workspace=server                             # opcional: cria a sala DEV001

npm run dev:server               # http://localhost:4001
npm run dev:web                  # em outro terminal — http://localhost:3000
```

Variáveis de ambiente (ver `server/.env.example` e `web/.env.example`):
- `server`: `PORT` (default `4001`), `WEB_ORIGIN` (default `http://localhost:3000`), `DATABASE_URL`.
- `web`: `NEXT_PUBLIC_SERVER_URL` (default `http://localhost:4001`).

## Scripts úteis (server)

```bash
npm run typecheck --workspace=server   # tsc --noEmit
npm run build --workspace=server       # bundle de produção (esbuild) em server/dist/index.js
npm run db:studio --workspace=server   # Prisma Studio (navegar o banco visualmente)
```

## Deploy

Ver `DEPLOY.md` — guia completo pra publicar (Vercel + Railway/Render), incluindo a opção de usar as imagens Docker direto (`server/Dockerfile`, `web/Dockerfile`) em qualquer plataforma que rode containers.
