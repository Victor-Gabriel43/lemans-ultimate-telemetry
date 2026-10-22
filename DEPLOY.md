# Deploy — LMU Race Engineer

Guia pra publicar o app de verdade, seguível do zero. Ninguém além de você precisa mexer nisso — eu (Claude) não tenho acesso a nenhuma conta sua, então todo passo aqui é pra você mesmo executar.

## Status atual (deploy já feito em 27/08/2026)

- **App (produção)**: https://lemans-ultimate.vercel.app ← link pra jogar/testar
- **Backend (Render)**: https://lemans-ultimate.onrender.com
- **Banco**: Neon, projeto `lmu-race-engineer` (região `sa-east-1`)
- **Repo**: https://github.com/Vinii225/lemans-ultimate

Tudo nos planos free (Vercel Hobby, Render Free, Neon Free). Ver seção **"Pegadinhas encontradas no primeiro deploy"** no fim deste arquivo antes de mexer em qualquer env var ou fazer redeploy manual — evita repetir os mesmos erros.

**Arquitetura do deploy:**

```
Vercel (web/)  <-- HTTPS/WSS -->  Render (server/)  <-->  Neon (Postgres)
```

- **`web`** (Next.js) vai pra **Vercel** — é o caso de uso padrão deles, deploy em 2 cliques a partir do GitHub.
- **`server`** (Express + Socket.IO + Prisma) vai pra **Render** — plataforma que roda um processo Node de longa duração (a Vercel é serverless e não segura conexões WebSocket abertas por muito tempo, por isso o backend não pode ir pra lá).
- **Banco**: Postgres gerenciado pela **Neon**, não pelo Render.

  > **Por que não usar o Postgres do próprio Render?** Ele é gratuito só por 30 dias (+14 de carência) e depois é apagado — ruim pra um app de verdade. A Neon não tem esse prazo de validade: o banco "dorme" (autosuspend) quando ninguém usa, mas os dados continuam lá indefinidamente no plano grátis.

- **Nenhum provedor daqui é "grátis e sem limite" de verdade** — não existe isso pra um backend com WebSocket + banco. Os limites reais desse combo (ago/2026):
  - **Render free**: 750h de instância/mês (dá pra deixar um serviço rodando o mês inteiro) e o serviço **dorme após 15 min sem tráfego**, com cold start de 30-60s pra acordar. Pra um app de sala usado em sessões (não 24/7), isso costuma ser tranquilo — só espera um pouco na primeira conexão depois de um tempo parado.
  - **Neon free**: 0,5 GB de armazenamento e 100 CU-hora/mês por projeto, sem prazo de expiração — o banco também entra em autosuspend por inatividade, mas acorda sozinho na próxima query.
  - Se esses limites virarem problema (uso intenso, muitos usuários), o próximo passo é upgrade pago em um dos dois, não uma "alternativa grátis ilimitada" — ela não existe.
- O projeto já tem `server/Dockerfile` e `web/Dockerfile` testados (ver `docker-compose.yml` pra rodar tudo localmente antes de publicar) — o Render builda direto a partir do Dockerfile, o que simplifica bastante o passo do backend.

Tempo estimado: 20-30 minutos na primeira vez.

---

## Pré-requisitos

- Conta no [GitHub](https://github.com) (você já tem — o repo é `Vinii225/lemans-ultimate`).
- Conta na [Vercel](https://vercel.com) (grátis, pode entrar com o GitHub).
- Conta na [Neon](https://neon.tech) (grátis, pode entrar com o GitHub).
- Conta no [Render](https://render.com) (grátis, pode entrar com o GitHub).

---

## Passo 1 — Subir o código pro GitHub

Se ainda não fez isso:

```bash
git push -u origin main
```

(o remote `origin` já está configurado pra `git@github.com:Vinii225/lemans-ultimate.git`.)

A partir daqui, tanto a Vercel quanto o Render vão puxar o código direto do GitHub — todo novo `git push` pode disparar um redeploy automático (você escolhe isso nas configurações de cada uma).

---

## Passo 2 — Banco na Neon

1. Entre em [neon.tech](https://neon.tech), **Create a project** (nome sugerido: `lmu-race-engineer`, região mais perto de você).
2. No painel do projeto, vá em **Connection Details** / **Dashboard** e copie a **connection string** no formato `postgresql://usuario:senha@host/dbname?sslmode=require` — é o botão "Copy" ao lado de "Connection string" (escolha a variante **pooled connection**, geralmente já é a default e o host tem `-pooler` no nome — melhor pra uma API com várias conexões simultâneas como essa).
3. Guarde essa string — vai usar como `DATABASE_URL` no Passo 3.

---

## Passo 3 — Backend no Render

1. Entre em [render.com](https://render.com), **New → Web Service**, conecte o GitHub e escolha `Vinii225/lemans-ultimate`.
2. Configure o build:
   - **Runtime**: Docker
   - **Dockerfile Path**: `server/Dockerfile`
   - **Docker Build Context Directory**: `.` (a raiz do repo inteiro — o build precisa enxergar o workspace `shared/` também, não só a pasta `server/`).
   - **Instance Type**: Free
3. Em **Environment Variables**, adicione:
   - `DATABASE_URL` → a connection string da Neon copiada no Passo 2.
   - `PORT` → `4001`.
   - `WEB_ORIGIN` → a URL da Vercel (você só vai saber ela depois do Passo 4 — pode deixar um placeholder tipo `https://placeholder.vercel.app` por enquanto e voltar aqui pra corrigir).
4. Deploy. As migrations rodam sozinhas no boot do container (é o que `server/docker-entrypoint.sh` faz) — não precisa de passo manual nenhum aqui.
5. Copie a URL pública que o Render gerou pro serviço (algo como `https://seu-servico.onrender.com`) — vai precisar dela no Passo 4.

---

## Passo 4 — Frontend na Vercel

A Vercel não builda a partir de Dockerfile (sempre usa o build nativo dela) — isso é normal, é assim que ela funciona pra qualquer projeto Next.js.

1. Entre em [vercel.com](https://vercel.com), **Add New → Project**, importe `Vinii225/lemans-ultimate`.
2. Em **Root Directory**, clique em "Edit" e selecione `web`. A Vercel detecta automaticamente que é um monorepo com npm workspaces (por causa do `package.json` com `"workspaces"` na raiz) e ajusta o install sozinha — normalmente não precisa mexer em Build/Install Command, mas se o deploy falhar reclamando de não achar `@lmu/shared`, force manualmente em **Settings → Build & Development Settings**:
   - **Install Command**: `cd ../.. && npm install` (o `../..` é relativo ao Root Directory `web`, ou seja, volta pra raiz do monorepo).
   - **Build Command**: `npm run build` (padrão do Next.js, mantém).
3. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_SERVER_URL` → a URL pública do backend no Render (do Passo 3.5), ex: `https://seu-servico.onrender.com`.
4. Deploy. A Vercel te dá uma URL tipo `https://seu-projeto.vercel.app`.
5. **Volte no Render** e corrija a variável `WEB_ORIGIN` do backend pra essa URL da Vercel de verdade (não o placeholder do Passo 3.3) — isso é o que libera o CORS pro seu frontend conseguir falar com o backend. Redeploy o backend depois de mudar a variável (o Render geralmente faz isso sozinho ao salvar).

---

## Passo 5 — Testar

1. Abra a URL da Vercel. Crie uma sala.
2. **A primeira conexão pode demorar 30-60s** se o backend estava dormindo (free tier do Render dorme após 15 min sem tráfego) — é normal, não é erro.
3. Abra a mesma URL num outro dispositivo/aba anônima, entre com o código da sala.
4. Edite algo (ex: a planilha de escala) numa aba e confirme que aparece na outra em tempo real.
5. Se a sala não conectar (fica em "Conectando…" por muito mais que 1 minuto): abra o DevTools do navegador (F12) → aba Console/Network, procure erro de CORS ou WebSocket — geralmente é `WEB_ORIGIN` no backend não batendo exatamente com a URL da Vercel (confira `https://` vs sem, e sem barra `/` no final).

---

## Notas importantes

- **Testar tudo localmente antes de publicar**: `docker compose up --build` na raiz do repo sobe a stack inteira (Postgres + server + web) exatamente como vai rodar em produção — vale rodar isso pelo menos uma vez antes do primeiro deploy de verdade, pra pegar qualquer problema de ambiente sem depender do Render/Vercel/Neon pra descobrir.
- **Telemetria (Fase 14) e mixed content**: a Vercel serve tudo em HTTPS. O toggle "Conectar telemetria local" faz `fetch` pra `http://localhost:6397` (a API do jogo, na máquina de quem está jogando) — isso é HTTPS→HTTP, que navegadores podem bloquear como "mixed content". O app já trata essa falha graciosamente (cai em modo manual, mostra a mensagem de ajuda — ver `docs/telemetry-api.md`), mas se quiser que funcione de verdade, a pessoa no PC do jogo pode precisar permitir "conteúdo não seguro" pro domínio da Vercel nas configurações do navegador dela.
- **Nunca commitar `.env`**: os arquivos `.env` reais (com segredos) já estão no `.gitignore` — só os `.env.example` (sem valores reais) são versionados. As variáveis de produção (banco, `WEB_ORIGIN`, etc) ficam configuradas direto nos painéis do Render/Vercel/Neon, nunca em arquivo commitado.
- **Redeploys automáticos**: Vercel e Render podem redeployar sozinhos a cada `git push` na branch `main`, se você ligar essa opção (geralmente é o padrão). Se preferir mais controle, desligue o auto-deploy e publique manualmente quando quiser.
- **Free tier não é ilimitado**: se o app crescer (mais uso, mais dados), o Render free (750h/mês, dorme por inatividade) e a Neon free (0,5 GB, 100 CU-hora/mês) vão eventualmente esbarrar em limite. Nesse ponto o caminho é upgrade pago em um dos dois — não existe alternativa grátis sem nenhum limite pra esse tipo de app.

---

## Pegadinhas encontradas no primeiro deploy (27/08/2026)

Coisas que travaram na prática e como foram resolvidas — vale ler antes de repetir alguma dessas ações:

1. **Neon: use a connection string SEM pooling no `DATABASE_URL`.** A versão "pooled" (host com `-pooler`, PgBouncer em modo transaction) faz o `prisma migrate deploy` travar/pendurar indefinidamente no boot do container, porque o Prisma Migrate precisa de advisory locks que esse modo de pooling não segura direito. Na tela "Connect to your branch" da Neon, **desligue o toggle "Connection pooling"** antes de copiar a string. Isso vale tanto pra migrations quanto pro uso normal da API — não tem downside real pra uma app desse porte usar a conexão direta o tempo todo.

2. **Variável `NEXT_PUBLIC_SERVER_URL` na Vercel: crie como tipo "Config", não "Secret".** Uma vez salva como "Secret" ela vira write-only (não dá pra ver nem editar o valor de novo, só deletar e recriar) — e a Vercel não deixa converter Secret→Config depois. Como é uma variável `NEXT_PUBLIC_*` (já é pública por natureza, embutida no JS do navegador), não faz sentido ela ser "Secret". Se precisar trocar o valor no futuro e a variável estiver como Secret, é mais rápido deletar e recriar do zero como Config.

3. **Teste sempre no domínio de produção fixo (`lemans-ultimate.vercel.app`), nunca na URL única de um deploy específico** (tipo `lemans-ultimate-xxxxx-ares-projects-xxxx.vercel.app`). O `WEB_ORIGIN` configurado no Render é uma origem exata pro CORS — só bate com o domínio de produção, não com as URLs de preview por-deploy que a Vercel gera a cada build.

4. **Render tem uma opção "Skip deployments when there are no changes to the root directory"** (Settings → Build and Deployment) que só afeta a Vercel de reflexo indireto: se você tentar forçar um redeploy na Vercel com um commit vazio (sem mudar arquivo nenhum dentro de `web/`), a Vercel pode pular o build sozinha por essa lógica equivalente do lado dela. Pra forçar rebuild de verdade sem mudar código, use o botão de **"Redeploy" manual pelo dashboard** (que rebuilda com as env vars atuais) em vez de um `git commit --allow-empty`.

5. **Depois de editar qualquer env var `NEXT_PUBLIC_*` na Vercel, sempre faça um redeploy manual.** Essas variáveis são embutidas no bundle JS em build time — mudar o valor no painel não afeta nada até rebuildar.

6. **"Redeploy" na Vercel não conserta um build quebrado por erro de código.** Se um push (seu ou de alguém que também tem acesso ao repo) introduziu um erro de TypeScript, o botão "Redeploy" do dashboard só reexecuta o mesmo build — vai falhar de novo do mesmo jeito, porque o Next.js roda type-check completo (`tsc`) como parte do `next build`, e a Vercel builda exatamente esse mesmo comando. **Antes de insistir em redeploy pela Vercel, reproduza o erro localmente** (bem mais rápido que esperar o build na nuvem):
   ```bash
   npm run build:shared   # (na raiz) recompila o pacote @lmu/shared — o web depende dele
   cd web && npm run build
   ```
   Se der erro de `tsc` mencionando um evento de socket (algo como `Argument of type '"xxx:yyy"' is not assignable to parameter of type ...`), normalmente é porque alguém emitiu/ouviu um evento novo em `web/state/roomStore.ts` (ou em algum componente) sem declará-lo em `shared/src/index.ts` (`ClientToServerEvents`/`ServerToClientEvents`) — e, do lado do servidor, sem o handler correspondente em `server/src/socket/index.ts`. É um erro de código real, não de configuração de deploy: precisa entrar no repo (via PR/commit) antes que qualquer redeploy — automático ou manual — funcione. (Aconteceu em 09/09/2026 com os eventos `driver:*`, adicionados no frontend antes do backend — corrigido adicionando os tipos em `shared` e os handlers em `server/src/rooms/driverService.ts`.)
