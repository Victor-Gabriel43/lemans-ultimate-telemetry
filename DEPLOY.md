# Deploy — LMU Race Engineer

Guia pra publicar o app de verdade, seguível do zero. Ninguém além de você precisa mexer nisso — eu (Claude) não tenho acesso a nenhuma conta sua, então todo passo aqui é pra você mesmo executar.

**Arquitetura do deploy:**

```
Vercel (web/)  <-- HTTPS/WSS -->  Railway ou Render (server/ + Postgres)
```

- **`web`** (Next.js) vai pra **Vercel** — é o caso de uso padrão deles, deploy em 2 cliques a partir do GitHub.
- **`server`** (Express + Socket.IO + Prisma) vai pra **Railway** ou **Render** — plataformas que rodam um processo Node de longa duração (a Vercel é serverless e não segura conexões WebSocket abertas por muito tempo, por isso o backend não pode ir pra lá).
- **Banco**: Postgres (já é o único banco do projeto — ver `PASSO_A_PASSO.md`). Railway e Render oferecem Postgres gerenciado dentro do mesmo painel.
- O projeto já tem `server/Dockerfile` e `web/Dockerfile` testados (ver `docker-compose.yml` pra rodar tudo localmente antes de publicar) — a Railway e a Render conseguem buildar direto a partir deles, o que simplifica bastante o passo do backend.

Tempo estimado: 20-30 minutos na primeira vez.

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

## Passo 2 — Backend na Railway

1. Entre em [railway.app](https://railway.app), **New Project → Deploy from GitHub repo**, escolha `Vinii225/lemans-ultimate`.
2. Nas configurações do serviço (aba **Settings → Build**), diga pra Railway usar o Dockerfile do server em vez de tentar detectar automaticamente (ela erraria, é um monorepo):
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `server/Dockerfile`
   - **Root Directory / Build Context**: deixe em branco / `/` (a raiz do repo inteiro — o build precisa enxergar o workspace `shared/` também, não só a pasta `server/`).

   *(Alternativa sem Docker, se preferir: Builder "Nixpacks", Build Command `npm install && npm run build --workspace=server`, Start Command `npm run start --workspace=server` — mas aí o `docker-entrypoint.sh` não roda sozinho, então você precisa rodar `npx prisma migrate deploy --schema=server/prisma/schema.prisma` manualmente depois de cada deploy, via shell remoto da Railway. Usando o Dockerfile, as migrations já rodam automaticamente no boot do container — mais simples.)*
3. Adicione um banco Postgres ao projeto: **New → Database → PostgreSQL** (dentro do mesmo projeto Railway). Ela cria a variável `DATABASE_URL` automaticamente — no serviço do backend, em **Variables**, referencie-a como `${{Postgres.DATABASE_URL}}` (a Railway autocompleta isso quando você clica "Add Variable Reference").
4. Ainda em **Variables** do serviço do backend, adicione:
   - `PORT` → a Railway já define isso sozinha na maioria dos casos; se não, use `4001`.
   - `WEB_ORIGIN` → a URL da Vercel (você só vai saber ela depois do Passo 3 — pode deixar um placeholder tipo `https://placeholder.vercel.app` por enquanto e voltar aqui pra corrigir).
5. Deploy. Se você usou o Dockerfile, as migrations rodam sozinhas no boot (é o que `server/docker-entrypoint.sh` faz) — não precisa de passo manual nenhum aqui.
6. Copie a URL pública que a Railway gerou pro serviço (algo como `https://seu-servico.up.railway.app`) — vai precisar dela no Passo 3.

**Alternativa Render**: mesmo racional — criar um "Web Service", **Runtime: Docker**, **Dockerfile Path**: `server/Dockerfile`, Root Directory vazio/raiz, um "PostgreSQL" gerenciado à parte, variáveis de ambiente equivalentes.

---

## Passo 3 — Frontend na Vercel

A Vercel não builda a partir de Dockerfile (sempre usa o build nativo dela) — isso é normal, é assim que ela funciona pra qualquer projeto Next.js.

1. Entre em [vercel.com](https://vercel.com), **Add New → Project**, importe `Vinii225/lemans-ultimate`.
2. Em **Root Directory**, clique em "Edit" e selecione `web`. A Vercel detecta automaticamente que é um monorepo com npm workspaces (por causa do `package.json` com `"workspaces"` na raiz) e ajusta o install sozinha — normalmente não precisa mexer em Build/Install Command, mas se o deploy falhar reclamando de não achar `@lmu/shared`, force manualmente em **Settings → Build & Development Settings**:
   - **Install Command**: `cd ../.. && npm install` (o `../..` é relativo ao Root Directory `web`, ou seja, volta pra raiz do monorepo).
   - **Build Command**: `npm run build` (padrão do Next.js, mantém).
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SERVER_URL` → a URL pública do backend na Railway (do Passo 2.6), ex: `https://seu-servico.up.railway.app`.
4. Deploy. A Vercel te dá uma URL tipo `https://seu-projeto.vercel.app`.
5. **Volte na Railway** e corrija a variável `WEB_ORIGIN` do backend pra essa URL da Vercel de verdade (não o placeholder do Passo 2.4) — isso é o que libera o CORS pro seu frontend conseguir falar com o backend. Redeploy o backend depois de mudar a variável (a Railway geralmente faz isso sozinha ao salvar).

---

## Passo 4 — Testar

1. Abra a URL da Vercel. Crie uma sala.
2. Abra a mesma URL num outro dispositivo/aba anônima, entre com o código da sala.
3. Edite algo (ex: a planilha de escala) numa aba e confirme que aparece na outra em tempo real.
4. Se a sala não conectar (fica em "Conectando…" pra sempre): abra o DevTools do navegador (F12) → aba Console/Network, procure erro de CORS ou WebSocket — geralmente é `WEB_ORIGIN` no backend não batendo exatamente com a URL da Vercel (confira `https://` vs sem, e sem barra `/` no final).

---

## Notas importantes

- **Testar tudo localmente antes de publicar**: `docker compose up --build` na raiz do repo sobe a stack inteira (Postgres + server + web) exatamente como vai rodar em produção — vale rodar isso pelo menos uma vez antes do primeiro deploy de verdade, pra pegar qualquer problema de ambiente sem depender da Railway/Vercel pra descobrir.
- **Telemetria (Fase 14) e mixed content**: a Vercel serve tudo em HTTPS. O toggle "Conectar telemetria local" faz `fetch` pra `http://localhost:6397` (a API do jogo, na máquina de quem está jogando) — isso é HTTPS→HTTP, que navegadores podem bloquear como "mixed content". O app já trata essa falha graciosamente (cai em modo manual, mostra a mensagem de ajuda — ver `docs/telemetry-api.md`), mas se quiser que funcione de verdade, a pessoa no PC do jogo pode precisar permitir "conteúdo não seguro" pro domínio da Vercel nas configurações do navegador dela.
- **Nunca commitar `.env`**: os arquivos `.env` reais (com segredos) já estão no `.gitignore` — só os `.env.example` (sem valores reais) são versionados. As variáveis de produção (banco, `WEB_ORIGIN`, etc) ficam configuradas direto nos painéis da Railway/Vercel, nunca em arquivo commitado.
- **Redeploys automáticos**: tanto Vercel quanto Railway podem redeployar sozinhas a cada `git push` na branch `main`, se você ligar essa opção (geralmente é o padrão). Se preferir mais controle, desligue o auto-deploy e publique manualmente quando quiser.
