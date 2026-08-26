# LMU Race Engineer

Painel de estratégia colaborativo em tempo real para corridas de endurance no Le Mans Ultimate. Crie uma "sala de corrida", compartilhe o código de convite com a equipe, e todo mundo edita combustível, pneus, danos, pit stops e a escala de pilotos ao vivo — sem F5.

**Antes de mexer no código, leia `PASSO_A_PASSO.md`** — é o roadmap fase a fase de como o projeto foi construído, com as decisões técnicas e os porquês de cada uma. `docs/design-system.md` e `docs/telemetry-api.md` têm as decisões de UI e da integração com o jogo já pesquisadas — não redecidir sem motivo.

## Estrutura

```
shared/   tipos TypeScript + lógica compartilhada entre server e web (@lmu/shared)
server/   Express + Socket.IO + Prisma (tempo real e persistência)
web/      Next.js (App Router) — frontend
```

## Rodando localmente

```bash
npm install                 # na raiz — instala as 3 workspaces de uma vez

npm run dev:server          # sobe o servidor (padrão: http://localhost:4001)
npm run dev:web             # em outro terminal — sobe o Next.js (http://localhost:3000)
```

Banco local: SQLite, zero setup (`server/prisma/dev.db`, gitignored). Primeira vez: copie `server/.env.example` pra `server/.env`, rode `npx prisma migrate dev` dentro de `server/` se `dev.db` ainda não existir, e opcionalmente `npm run db:seed --workspace=server` pra criar a sala de teste `DEV001` com dados de exemplo.

Variáveis de ambiente (opcionais em dev, têm default — ver `server/.env.example` e `web/.env.example`):
- `server`: `PORT` (default `4001`), `WEB_ORIGIN` (default `http://localhost:3000`), `DATABASE_URL` (default `file:./dev.db`).
- `web`: `NEXT_PUBLIC_SERVER_URL` (default `http://localhost:4001`).

## Scripts úteis (server)

```bash
npm run typecheck --workspace=server   # tsc --noEmit
npm run build --workspace=server       # bundle de produção (esbuild) em server/dist/index.js
npm run db:studio --workspace=server   # Prisma Studio (navegar o banco visualmente)
```

## Deploy

Ver `DEPLOY.md` — guia completo pra publicar (Vercel + Railway/Render), incluindo a troca de SQLite pra Postgres em produção.
