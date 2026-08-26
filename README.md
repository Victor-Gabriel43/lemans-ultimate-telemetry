# LMU Race Engineer

Painel de estratégia colaborativo em tempo real para corridas de endurance no Le Mans Ultimate.

**Antes de mexer no código, leia `PASSO_A_PASSO.md`** — é o roadmap detalhado de implementação, com o status atual do projeto e a ordem correta das próximas fases. `docs/design-system.md` e `docs/telemetry-api.md` têm as decisões de UI e da integração com o jogo já pesquisadas — não redecidir.

## Estrutura

```
shared/   tipos TypeScript compartilhados entre server e web (@lmu/shared)
server/   Express + Socket.IO + Prisma (tempo real e persistência)
web/      Next.js (App Router) — frontend
```

## Rodando localmente

```bash
npm install                 # na raiz — instala as 3 workspaces de uma vez

npm run dev:server          # sobe o servidor (padrão: http://localhost:4001)
npm run dev:web             # em outro terminal — sobe o Next.js (http://localhost:3000)
```

Variáveis de ambiente (opcionais em dev, têm default):
- `server`: `PORT` (default `4001`), `WEB_ORIGIN` (default `http://localhost:3000`), `DATABASE_URL` (definida depois da Fase 2, Prisma).
- `web`: `NEXT_PUBLIC_SERVER_URL` (default `http://localhost:4001`, usado a partir da Fase 3).

## Deploy

Ainda não aplicável — vem no `DEPLOY.md`, escrito na última fase do roadmap (`PASSO_A_PASSO.md`).
