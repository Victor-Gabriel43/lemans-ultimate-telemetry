# LMU Race Engineer

Painel de estratégia colaborativo em tempo real para corridas de endurance no Le Mans Ultimate. Crie uma "sala de corrida", compartilhe o código de convite com a equipe, e todo mundo edita combustível, pneus, danos, pit stops e a escala de pilotos ao vivo — sem F5.

## Funcionalidades

- **Salas de corrida**: crie uma sala nova ou entre em uma existente com um código de convite — sem login, sem cadastro.
- **Dashboard geral**: status da corrida, estatísticas editáveis por qualquer participante e piloto atual em destaque.
- **Escala de pilotos**: planilha colaborativa em tempo real (reordenar stints com setas, editar direto na tabela).
- **Combustível, pneus e danos**: controle dedicado pra cada um, todos sincronizados ao vivo entre os participantes.
- **Planejador de pit stop**: monta o plano (combustível + pneu + troca de piloto + reparos), com opção de cancelar um pit stop iniciado por engano.
- **Timeline visual** da corrida a partir dos stints escalados.
- **Alertas**: toasts derivados do estado da sala (ex. cobertura de horário), sem persistência.
- **Telemetria local (opcional, best-effort)**: conecta em `http://localhost:6397` no PC que roda o jogo e alimenta a sala automaticamente — nunca bloqueia o uso manual se falhar.
- **Exportação**: JSON completo da sala + CSV da escala final, gerados a partir do estado persistido no servidor.
- Tudo em tempo real via Socket.IO — qualquer participante edita, todo mundo vê a atualização na hora, sem F5. Não há hierarquia de permissões: todo mundo pode editar tudo (decisão explícita de escopo da v1).

## Stack

- **shared**: TypeScript — tipos e lógica compartilhada entre `server` e `web` (`@lmu/shared`).
- **server**: Express + Socket.IO + Prisma (build de produção via esbuild).
- **web**: Next.js 16 (App Router) + React 19 + Zustand + Tailwind CSS 4.
- **Banco**: Postgres (único suportado — dev e produção).

## Estrutura

```
shared/   tipos TypeScript + lógica compartilhada entre server e web (@lmu/shared)
server/   Express + Socket.IO + Prisma (tempo real e persistência)
web/      Next.js (App Router) — frontend
```

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

`server/Dockerfile` e `web/Dockerfile` buildam direto em qualquer plataforma que rode containers (Railway, Render, etc.) — `web` também pode ir pra Vercel via build nativo do Next.js. Banco: Postgres gerenciado da própria plataforma.
