# Deploy — LMU Race Engineer

Guia pra publicar o app de verdade, seguível do zero. Ninguém além de você precisa mexer nisso — eu (Claude) não tenho acesso a nenhuma conta sua, então todo passo aqui é pra você mesmo executar.

**Arquitetura do deploy:**

```
Vercel (web/)  <-- HTTPS/WSS -->  Railway ou Render (server/ + Postgres)
```

- **`web`** (Next.js) vai pra **Vercel** — é o caso de uso padrão deles, deploy em 2 cliques a partir do GitHub.
- **`server`** (Express + Socket.IO + Prisma) vai pra **Railway** ou **Render** — plataformas que rodam um processo Node de longa duração (a Vercel é serverless e não segura conexões WebSocket abertas por muito tempo, por isso o backend não pode ir pra lá).
- **Banco**: em dev local usamos SQLite (arquivo, zero setup). Em produção, **trocamos pra Postgres** (gerenciado pela própria Railway/Render) — ver Passo 3, é a parte que mais merece atenção.

Tempo estimado: 30-45 minutos na primeira vez.

---

## Pré-requisitos

- Conta no [GitHub](https://github.com) (você já tem — o repo é `Vinii225/lemans-ultimate`).
- Conta na [Vercel](https://vercel.com) (grátis, pode entrar com o GitHub).
- Conta na [Railway](https://railway.app) **ou** [Render](https://render.com) (ambas têm plano grátis/trial suficiente pra isso; este guia usa a Railway como exemplo principal — os passos no Render são equivalentes, só a tela muda).

---

## Passo 1 — Subir o código pro GitHub

Se ainda não fez isso:

```bash
git push -u origin main
```

(o remote `origin` já está configurado pra `git@github.com:Vinii225/lemans-ultimate.git`.)

A partir daqui, tanto a Vercel quanto a Railway vão puxar o código direto do GitHub — todo novo `git push` pode disparar um redeploy automático (você escolhe isso nas configurações de cada uma).

---

## Passo 2 — Trocar o banco de SQLite pra Postgres

Isso é **obrigatório antes de deployar o backend**. SQLite é um arquivo local — não sobrevive a redeploys/reinícios num serviço cloud, e não dá pra várias instâncias do servidor compartilharem o mesmo arquivo.

1. Abra `server/prisma/schema.prisma` e troque:

   ```prisma
   datasource db {
     provider = "sqlite"
     url      = env("DATABASE_URL")
   }
   ```

   pra:

   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

2. Rode `npx prisma migrate dev --name switch_to_postgres` (dentro de `server/`, com um Postgres **local** rodando temporariamente — ex: `docker run --name lmu-postgres-temp -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16` e `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/postgres" npx prisma migrate dev --name switch_to_postgres`). Isso gera os arquivos de migration compatíveis com Postgres em `server/prisma/migrations/`.
3. Confira que a migration nova foi criada em `server/prisma/migrations/` e dê commit:

   ```bash
   git add server/prisma
   git commit -m "Troca o banco pra Postgres (produção)"
   git push
   ```

**A partir daqui, `npm run dev:server` local vai pedir um Postgres rodando** (não SQLite mais) — se quiser continuar desenvolvendo localmente sem depender de Postgres, considere manter essa troca numa branch separada (ex: `deploy/postgres`) até estar pronto pra ir pra produção de vez, mergeando só quando for publicar. Isso é uma escolha sua — o roadmap (`PASSO_A_PASSO.md`) não opinou sobre isso porque é uma decisão de fluxo de trabalho, não de arquitetura.

---

## Passo 3 — Backend na Railway

1. Entre em [railway.app](https://railway.app), **New Project → Deploy from GitHub repo**, escolha `Vinii225/lemans-ultimate`.
2. A Railway vai tentar detectar automaticamente — **isso provavelmente vai dar errado** porque é um monorepo. Corrija manualmente nas configurações do serviço (aba **Settings**):
   - **Root Directory**: deixe em branco / `/` (a raiz do repo — **não** aponte pra `server/`, porque o build precisa enxergar o workspace `shared/` também).
   - **Build Command**: `npm install && npm run build --workspace=server`
   - **Start Command**: `npm run start --workspace=server`

   (Esses dois comandos foram testados de verdade nesta sessão — `npm install` na raiz resolve os workspaces, `npm run build --workspace=server` gera `server/dist/index.js` via esbuild, um bundle único que já embute o código de `shared/` — não precisa buildar `shared/` separado.)
3. Adicione um banco Postgres ao projeto: **New → Database → PostgreSQL** (dentro do mesmo projeto Railway). Ela cria a variável `DATABASE_URL` automaticamente — no serviço do backend, em **Variables**, referencie-a como `${{Postgres.DATABASE_URL}}` (a Railway autocompleta isso quando você clica "Add Variable Reference").
4. Ainda em **Variables** do serviço do backend, adicione:
   - `PORT` → a Railway já define isso sozinha na maioria dos casos; se não, use `4001`.
   - `WEB_ORIGIN` → a URL da Vercel (você só vai saber ela depois do Passo 4 — pode deixar um placeholder tipo `https://placeholder.vercel.app` por enquanto e voltar aqui pra corrigir).
5. Depois do primeiro deploy funcionar (o serviço "up"), rode as migrations contra o Postgres de produção. A forma mais simples: na aba do serviço, abra um **shell/terminal remoto** (Railway tem essa opção) e rode:
   ```bash
   npx prisma migrate deploy --schema=server/prisma/schema.prisma
   ```
   (`migrate deploy`, não `migrate dev` — esse é o comando não-interativo pra ambientes de produção, só aplica as migrations já existentes, não gera novas.)
6. Copie a URL pública que a Railway gerou pro serviço (algo como `https://seu-servico.up.railway.app`) — vai precisar dela no Passo 4.

**Alternativa Render**: mesmo racional — criar um "Web Service" apontando pro repo, Root Directory vazio/raiz, mesmos Build/Start Commands, um "PostgreSQL" gerenciado à parte, variáveis de ambiente equivalentes.

---

## Passo 4 — Frontend na Vercel

1. Entre em [vercel.com](https://vercel.com), **Add New → Project**, importe `Vinii225/lemans-ultimate`.
2. Em **Root Directory**, clique em "Edit" e selecione `web`. A Vercel detecta automaticamente que é um monorepo com npm workspaces (por causa do `package.json` com `"workspaces"` na raiz) e ajusta o install sozinha — normalmente não precisa mexer em Build/Install Command, mas se o deploy falhar reclamando de não achar `@lmu/shared`, force manualmente em **Settings → Build & Development Settings**:
   - **Install Command**: `cd ../.. && npm install` (o `../..` é relativo ao Root Directory `web`, ou seja, volta pra raiz do monorepo).
   - **Build Command**: `npm run build` (padrão do Next.js, mantém).
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SERVER_URL` → a URL pública do backend na Railway (do Passo 3.6), ex: `https://seu-servico.up.railway.app`.
4. Deploy. A Vercel te dá uma URL tipo `https://seu-projeto.vercel.app`.
5. **Volte na Railway** e corrija a variável `WEB_ORIGIN` do backend pra essa URL da Vercel de verdade (não o placeholder do Passo 3.4) — isso é o que libera o CORS pro seu frontend conseguir falar com o backend. Redeploy o backend depois de mudar a variável (a Railway geralmente faz isso sozinha ao salvar).

---

## Passo 5 — Testar

1. Abra a URL da Vercel. Crie uma sala.
2. Abra a mesma URL num outro dispositivo/aba anônima, entre com o código da sala.
3. Edite algo (ex: a planilha de escala) numa aba e confirme que aparece na outra em tempo real.
4. Se a sala não conectar (fica em "Conectando…" pra sempre): abra o DevTools do navegador (F12) → aba Console/Network, procure erro de CORS ou WebSocket — geralmente é `WEB_ORIGIN` no backend não batendo exatamente com a URL da Vercel (confira `https://` vs sem, e sem barra `/` no final).

---

## Notas importantes

- **Telemetria (Fase 14) e mixed content**: a Vercel serve tudo em HTTPS. O toggle "Conectar telemetria local" faz `fetch` pra `http://localhost:6397` (a API do jogo, na máquina de quem está jogando) — isso é HTTPS→HTTP, que navegadores podem bloquear como "mixed content". O app já trata essa falha graciosamente (cai em modo manual, mostra a mensagem de ajuda — ver `docs/telemetry-api.md`), mas se quiser que funcione de verdade, a pessoa no PC do jogo pode precisar permitir "conteúdo não seguro" pro domínio da Vercel nas configurações do navegador dela.
- **Nunca commitar `.env`**: os arquivos `.env` reais (com segredos) já estão no `.gitignore` — só os `.env.example` (sem valores reais) são versionados. As variáveis de produção (banco, `WEB_ORIGIN`, etc) ficam configuradas direto nos painéis da Railway/Vercel, nunca em arquivo commitado.
- **Redeploys automáticos**: tanto Vercel quanto Railway podem redeployar sozinhas a cada `git push` na branch `main`, se você ligar essa opção (geralmente é o padrão). Se preferir mais controle, desligue o auto-deploy e publique manualmente quando quiser.
- **Voltar pra SQLite localmente**: se você seguiu a sugestão do Passo 2 de manter a troca numa branch separada, é só continuar desenvolvendo na branch antiga (SQLite) e só mergear pra `main`/produção quando quiser publicar uma atualização de verdade.
