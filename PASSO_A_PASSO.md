# LMU Race Engineer — Passo a Passo de Implementação

> **Leia isto primeiro em qualquer sessão nova.** Este arquivo é a fonte de verdade do progresso do projeto. Ele é longo de propósito: o objetivo é que uma sessão do Claude Code **sem nenhum contexto anterior** consiga abrir este arquivo e continuar exatamente de onde parou, sem precisar re-perguntar nada ao usuário nem redescobrir decisões já tomadas.

## Como retomar o trabalho (leia antes de codar)

1. Rode `git log --oneline -20` para ver o que já foi commitado.
2. Veja a seção **Status Atual** abaixo — ela diz exatamente qual é a próxima fase.
3. Abra a fase correspondente mais embaixo neste arquivo: ela lista os arquivos a criar/mudar e o critério de "pronto".
4. Depois de terminar uma fase: marque o checkbox `[x]`, atualize **Status Atual**, faça commit (`git add -A && git commit -m "..."`), e só então siga pra próxima fase.
5. Não pule fases fora de ordem — cada uma assume que a anterior está funcional (ex: não dá pra fazer a planilha de escala em tempo real sem a camada de socket da Fase 3 já funcionando).
6. Se algo neste documento conflitar com o que você encontrar no código (ex: um nome de arquivo mudou), o **código manda** — atualize este documento pra refletir a realidade antes de continuar.

---

## Status Atual

**Fases concluídas até agora: Fase 3 a 10.**
**Próxima fase a fazer: Fase 11 — Planejador de pit stop.**

Fase 10 testada no navegador: registrar dano severo → "Reparo estimado: 45min" / "Impacto no ritmo: ~8%" batendo exato com `damageRepairMinutesPerSeverity.SEVERE` / `damagePaceImpactPercentPerSeverity.SEVERE`; "Marcar reparado" move o item pra "Ver reparados" e o card volta a "Nenhum dano ativo" (verde). Adicionei dois settings novos em `RoomSettings` pra isso — **`damageRepairMinutesPerSeverity` e `damagePaceImpactPercentPerSeverity` são DIFERENTES de `pitActionDurationsSeconds.repairPerSeverity`** (que já existia desde a Fase 0): o primeiro par é "quanto tempo até o dano estar de fato consertado" + "quanto mais lento o carro fica enquanto isso" (o que a Fase 5/10 do pedido original pede); o segundo é "quanto tempo essa ação específica leva parado no box" (o que a Fase 11 vai somar pro tempo total de pit stop). Não confundir os dois ao implementar a Fase 11.

Padrão reaproveitado sem alteração nenhuma: `server/src/rooms/damageService.ts` + handlers `damage:log`/`damage:repair` seguem exatamente a mesma estrutura de `fuelService.ts`/`tireService.ts` (broadcast da lista completa via `damage:changed`). `web/lib/damageStats.ts` + `DamagePanel.tsx` seguem o mesmo molde de `fuelStats`/`tireStats` + painel com form rápido + histórico expansível. **Esse padrão está maduro agora — a Fase 11 (pit stop) é a primeira que precisa de algo genuinamente novo** (um fluxo com estado "em andamento" tipo start→complete, e que mexe em 3 domínios de uma vez: combustível, pneu, escala).

Fase 9 testada no navegador: trocar pneu cria stint (composto + volta de início vêm do `currentLap` da sala, calculado no servidor — nunca confiar no que o cliente manda pra isso), idade em voltas e grip estimado (`100 - idade × tireDegradationPercentPerLap`) recalculam **reativamente** quando o `currentLap` do dashboard muda, sem nenhum código extra de sincronização — é só consequência de `TirePanel` ler `room.currentLap` do mesmo snapshot que o dashboard edita. Confirmado com 30 voltas: 30×1.5%=45% de perda → 55% de grip, cor crítica (vermelho) e banner de recomendação de troca aparecendo corretamente (< 65% = recomenda trocar, < 80% = aviso, ver `web/lib/tireStats.ts`).

Histórico de stints (`computeStintHistory`) deriva a duração de cada stint pela volta de início do PRÓXIMO stint (ou pela volta atual, pro stint em uso) — não guarda "duração" como campo, calcula na hora. Esse é o mesmo princípio já usado na Fase 7 (planilha) e na Timeline (Fase 12 vai reusar de novo): **preferir derivar do que já existe a guardar estado redundante**.

Fase 8 testada no navegador (registrar consumo, cálculo de consumo médio/restante/voltas restantes com cor por status ok/aviso/crítico, calculadora de reabastecimento — todos os números conferidos manualmente e batendo). Não repeti a dança de duas abas desta vez: o broadcast usa exatamente o mesmo mecanismo (`io.to(roomId).emit("fuel:changed", listaCompleta)`) já comprovado 3x nas fases anteriores — reservar o teste multi-aba completo pra features com lógica de UI nova o suficiente pra valer a pena (ex: Fase 11 pit stop, que muda estado em 3 lugares de uma vez).

Adicionado `fuelTankLiters` em `RoomSettings`/`DEFAULT_ROOM_SETTINGS` (capacidade do tanque, usada como ponto de partida quando ninguém ainda registrou uma leitura absoluta de litros restantes). Salas antigas (settings salvas antes desta fase) continuam funcionando sem migration — `toRoom()` sempre faz `{ ...DEFAULT_ROOM_SETTINGS, ...JSON.parse(settingsJson) }`, então chave nova ausente no JSON salvo cai no default automaticamente. **Esse padrão vale pra qualquer campo novo que for adicionado em `RoomSettings` no futuro.**

**Outro bug de tipo do rascunho original corrigido nesta fase**: os eventos `fuel:log` e `damage:log` em `shared/src/index.ts` tinham `Omit<X, "id" | "roomId" | "createdAt">` — ou seja, **excluíam `roomId` do payload sem adicioná-lo de volta**, o que quebraria o handler no servidor (precisa de `roomId` pra saber pra qual sala é o evento e validar `ownsRoom`). Já corrigi os três (`fuel:log`, `tire:newStint`, `damage:log`) pra `Omit<X, ...> & { roomId: string }` — a Fase 9/10 pode usar os tipos como estão, sem precisar checar de novo. **Lição geral**: `shared/src/index.ts` foi escrito de uma vez só na Fase 0 sem testar cada evento — se alguma fase futura adicionar um evento novo de socket, não confiar que o payload está certo só porque compilou; só o uso real (escrever o handler + testar) pega esse tipo de erro.

Arquivos novos: `web/lib/fuelStats.ts` (`computeFuelStats`, `litersToRefuel` — funções puras, testáveis isoladas se algum dia quiserem testes automatizados), `web/components/fuel/FuelPanel.tsx`, `server/src/rooms/fuelService.ts`.

A Fase 7 (planilha de escala) é a feature central do produto e está funcional e testada de ponta a ponta: edição inline célula-a-célula (texto/número, sem modal), **Enter confirma e desce pra célula de baixo** (padrão planilha, testado de verdade — funciona), Esc cancela, troca de piloto/status via `<select>`, adicionar/remover linha, mover cima/baixo (swap de `order`), linha `ACTIVE` destacada (borda azul) e `DONE` esmaecida+riscada, painel de totais por piloto com detecção de violação de `maxStintMinutes`/`minRestMinutes`, alerta de cobertura (falta/sobra tempo não coberto), badge "editado por" com nome real (não UUID), e rota de tela cheia (`/room/[code]/schedule`) mostrando exatamente o mesmo estado ao vivo. Tudo confirmado com **duas abas reais abertas simultaneamente** — editar numa propaga pra outra sem reload, incluindo quando a aba receptora já estava aberta antes da edição (não é só rehydrate no load).

**Correção de dado importante feita nesta fase** (fazer isso ANTES de escrever qualquer módulo com "editado/criado por" daqui pra frente — Fases 8, 9, 10, 11): adicionada a tabela `RoomMember` (roster durável `userId → nome`, upsertado a cada `room:join`, incluído no `RoomSnapshot` como `members: RoomMember[]`). Sem isso, o `updatedBy`/`createdBy` guardado nas linhas é só um `userId` (uuid) — **sempre resolver o nome de exibição via `resolveMemberName(snapshot.members, userId)`** (`web/lib/members.ts`), nunca mostrar o `userId` cru na UI. Isso vale pra `FuelEntry.createdBy`, `TireEntry.createdBy`, `DamageEntry.createdBy`, `PitStop.createdBy` nas próximas fases.

Padrão de mutação estabelecido (reaproveitar em toda fase daqui pra frente, não reinventar):
- Um `server/src/rooms/<domínio>Service.ts` por domínio (ex: `scheduleService.ts`) com funções puras que recebem `roomId` + dados já validados/sanitizados e mexem no Prisma — nunca confiar direto num `Partial<T>` vindo do cliente sem sanitizar contra uma whitelist de campos (padrão em `sanitizeScheduleRowPatch`/`sanitizeDashboardPatch`).
- No `server/src/socket/index.ts`: todo handler de mutação começa com `if (!ownsRoom(payload.roomId)) return;`, faz a mutação num `try/catch`, e termina fazendo o serviço recarregar a lista inteira do banco e `io.to(roomId).emit("<domínio>:changed", listaCompleta)` — **broadcast da lista inteira, não diff** (mais simples, e os volumes de dados aqui são pequenos o suficiente pra não importar).
- No `web/state/roomStore.ts`: uma action por mutação; `update*` (edição de campo existente) faz merge otimista local ANTES de emitir (sensação instantânea pra quem editou); `add*`/`remove*`/`reorder*` (mudança estrutural) **não** faz otimista, só emite e deixa o `*:changed` do servidor atualizar — mais simples e evita ter que replicar a lógica de geração de `order`/id no cliente.
- Componentes de edição inline (texto/número) seguem o padrão `TextCell`/`NumberCell` de `ScheduleSheet.tsx`: estado de "qual célula está em edição" mora no componente PAI da tabela (não em cada célula), pra permitir o "Enter desce pra célula de baixo" — reusar esse padrão, não o `EditableStat` mais simples (que é só pra números soltos fora de tabela, como no dashboard).

Nota de metodologia de teste: nesta fase o **tamanho da janela do Chrome controlado pela skill `claude-in-chrome` variou entre chamadas** (938px → 750px → 1528px, sem eu pedir resize), causando vários cliques por coordenada de pixel errarem o alvo (não eram bugs do app — confirmei cada caso consultando o banco direto). Lição: **quando um clique por coordenada não parecer surtir efeito, não assumir bug — tirar screenshot nesse exato momento e/ou usar `find` + `form_input`/`click(ref=...)`** (imune a variação de viewport) em vez de insistir em coordenadas de uma screenshot antiga.

Fase 6 testada de ponta a ponta no Chrome real: iniciar corrida, editar volta/posição/tempos inline, ver os valores propagarem ao vivo pra outra aba **e** persistirem corretamente ao reconectar (uma aba nova reabrindo a sala já chega com os valores certos e o relógio de decorrido continuando do ponto certo, não resetando — prova que o rehydrate via banco está correto, não só o push ao vivo).

Peça de infraestrutura nova e importante que toda fase futura (7 a 13) vai reusar: **agora existe o primeiro handler de mutação de verdade** (`dashboard:update` no server + `updateDashboard` no client), estabelecendo o padrão a repetir:
- Servidor: sempre validar `socket.data.roomId === payload.roomId` antes de mutar (só quem deu join na sala pode editá-la — ver `server/src/socket/index.ts`), sanitizar o patch contra uma whitelist explícita de campos editáveis (nunca aceitar `Partial<X>` cru do cliente direto pro Prisma — ver `sanitizeDashboardPatch` em `roomService.ts`), persistir, e só then fazer `io.to(roomId).emit(...)` com o dado atualizado.
- Cliente: a action do Zustand aplica a mudança **otimisticamente** no estado local (pra sensação de "clicou, já mudou") e emite o evento; como o servidor reemite o valor confirmado pra sala inteira **incluindo quem editou**, não precisa de nenhuma reconciliação especial no emissor — o "eco" do próprio evento apenas confirma/sobrescreve com o valor real do banco.

Componentes novos: `web/components/EditableStat.tsx` (clique pra editar número, sem modal — Enter/blur salva, Esc cancela; **reusar isso na Fase 8/9/10** em vez de reinventar um padrão de edição diferente), `web/components/dashboard/{RaceStatusCard,CurrentDriverCard}.tsx`, `web/lib/format.ts` (`formatClock`, `formatLapTime`, `formatGap`).

Decisão de escopo consciente: os campos do dashboard (posição, tempos, gaps) **não têm rastreamento de "editado por" por campo** — só `ScheduleRow` e as tabelas de log (Fuel/Tire/Damage/PitStop) têm `updatedBy`/`createdBy` no schema, porque o pedido do usuário enfatiza rastreabilidade especialmente na planilha de escala. Se no futuro quiserem "editado por" também nos números do dashboard, precisa adicionar colunas extras no `Room` (ex: `positionUpdatedBy`) — não existe hoje.

Pegadinha de lint encontrada: o ESLint do Next 16 tem a regra `react-hooks/purity`, que **proíbe chamar `Date.now()`/`new Date()` direto no corpo de um componente** (só dentro de efeitos/handlers). `RaceStatusCard` guarda um `now` em `useState` atualizado via `setInterval` dentro de `useEffect`, em vez de chamar `Date.now()` no render. Lembrar disso em qualquer componente futuro que precise de "agora" (timeline da Fase 12, alertas da Fase 13).

Fase 5 testada visualmente no Chrome real (header sticky com blur, presença no header, botão de copiar convite com feedback de "copiado", grid de cards responsivo). Uma limitação de ambiente pra lembrar: a ferramenta `resize_window` da skill `claude-in-chrome` **não consegue ir abaixo de ~750px de largura neste ambiente** (parece ter um piso de janela do SO/Chrome) — não dá pra tirar screenshot real em 375px por aqui. Verificação em mobile de verdade (viewport < 640px) precisa ser feita pelo usuário no devtools do próprio navegador ou celular real; o que dá pra garantir por código é que as classes Tailwind seguem mobile-first corretamente (sem prefixo = 1 coluna, `sm:`/`lg:` adicionam colunas a partir de 640px/1024px).

Arquivos novos desta fase: `web/components/EditedByBadge.tsx` (badge "editado por X há Ns", tick a cada 1s via `setInterval`, usa `web/lib/relativeTime.ts`), `web/components/room/{RoomHeader,PresenceAvatars,CopyInviteButton}.tsx`, e `web/app/room/[code]/layout.tsx` — **o layout agora é quem decide idle/conectando/erro/entrar-nome vs. renderizar header+children**; `page.tsx` ficou só com o conteúdo do dashboard (assume que já está "joined", já que o layout garante isso). Isso significa que qualquer rota nova dentro de `/room/[code]/*` (ex: a tela cheia da escala na Fase 7, `/room/[code]/schedule`) **herda o header e o gating de join automaticamente, de graça** — não reimplementar isso de novo.

`lucide-react` foi adicionado como dependência do `web` pra ícones SVG (copiar, check, lápis) — usar essa lib pros próximos ícones, não emoji, conforme `docs/design-system.md`.

Fluxo completo testado **de verdade em navegador real** (Chrome via skill `claude-in-chrome`, não só via script Node): criar sala pela landing, entrar em `/room/[code]` com nome, presença aparecendo em tempo real numa segunda aba sem F5, e sumindo automaticamente ao fechar a aba. `web/app/room/[code]/page.tsx` hoje é só um **stub funcional** (presença + escala somente-leitura do seed) — o layout de verdade é a Fase 5.

Duas descobertas importantes desta fase (não repetir o erro / não perder o porquê):

1. **Bug real encontrado testando 2 abas**: `ConnectedUser` só tinha `userId` (persistido em localStorage) como identificador. Se a mesma pessoa abre 2 abas — cenário legítimo, não só artefato de teste —, as duas conexões compartilham o mesmo `userId`, e usar `userId` como `key` de lista no React causa `"Encountered two children with the same key"` (confirmado no console do navegador). **Corrigido**: `ConnectedUser` agora tem `socketId` (id da conexão em si, sempre único) além de `userId` (id da pessoa, pode repetir); a lista de presença usa `key={u.socketId}`, e `"(você)"` continua comparando por `userId`. Se algum dia mexer em `ConnectedUser` ou nas listas de presença, manter essa distinção.
2. **`shared/src/index.ts` não deve ser dividido em vários arquivos com `export * from "./algo.js"`** — isso quebrou o server em runtime (`SyntaxError: does not provide an export named ...`) porque a resolução de `./algo.js` apontando pra um `./algo.ts` real no disco se comporta diferente entre `tsx` (Node ESM) e o bundler do Next.js, e pelo menos um dos dois não resolveu certo. Solução aplicada: manter tudo num arquivo só (`shared/src/index.ts`), comentário no topo do arquivo explicando isso. Se `shared` crescer muito e precisar ser dividido, testar os dois lados (`server` rodando de verdade + `web` compilando) antes de commitar — não assumir que funciona só pelo `tsc --noEmit` passar (o erro anterior só aparecia em runtime, não no type-check).

O que existe agora, tecnicamente:

- `server/src/rooms/roomService.ts`: `createRoom`, `findRoomByInviteCode`, `getRoomSnapshot` (monta o `RoomSnapshot` completo a partir do Prisma, convertendo `Date`→ISO string e fazendo `JSON.parse` dos campos serializados).
- `server/src/socket/presence.ts` + `server/src/socket/index.ts`: presença em memória (`Map<roomId, Map<socketId, ConnectedUser>>`), handler de `room:join` (com `ack`) e `disconnect`.
- `POST /rooms` (REST, não socket) cria a sala — decisão: criar sala é uma ação pontual antes de entrar de fato na sala via socket, então REST simples fez mais sentido que um evento; `room:join` continua sendo socket porque precisa manter a conexão viva pra presença.
- `web/lib/socket.ts`: singleton do `socket.io-client` (uma conexão por aba).
- `web/lib/identity.ts`: localStorage por sala (`lmu:sessions`), **compartilhado entre abas do mesmo navegador** — é assim mesmo por design (identidade é "por navegador/dispositivo", não por aba); só importa pro caso real de "mesma pessoa, 2 dispositivos diferentes", que naturalmente têm localStorage separado.
- `web/state/roomStore.ts`: store Zustand com `join()`, escuta `presence:update`, e re-faz `room:join` automaticamente quando o socket reconecta (Socket.IO reconecta sozinho, mas o servidor não guarda presença entre desconexões — sem esse re-join automático a aba ficaria "conectada" no transporte mas sumida da lista de presença de todo mundo).
- `web/app/page.tsx`: landing com os dois cards (Criar/Entrar), formulário de criação chamando `POST /rooms` no servidor direto (não via socket).
- `web/app/room/[code]/page.tsx`: fluxo idle→conectando→erro→conectado, com fallback de "seu nome" quando não há identidade salva pra aquela sala (ex: alguém abrindo o link de convite pela primeira vez).

Schema Prisma criado e migration `20260826004008_init` aplicada (`server/prisma/dev.db`, sqlite, gitignored). Descoberta importante: **o conector SQLite do Prisma 5 rejeita o tipo `Json` no schema** (erro de validação, não roda `migrate dev`) — por isso `settingsJson` (em `Room`) e `repairs` (em `PitStop`) são `String` no banco, guardando `JSON.stringify(...)`/parseados manualmente na camada de serviço. Da mesma forma, **não usamos `enum` do Prisma nem scalar list (`String[]`)** — todo campo "enum" (`raceDurationType`, `status`, `source`, `severity`...) é `String` livre, validado contra as unions do `@lmu/shared` na camada de serviço (Fase 3+), não no banco. Isso é proposital: deixa o schema idêntico entre SQLite (dev) e Postgres (prod), então trocar o `provider` no `DEPLOY.md` (Fase 16) não deve exigir mexer nos models — só rodar `prisma migrate deploy` de novo contra o Postgres.

Seed de desenvolvimento pronto e testado: `npm run db:seed --workspace=server` cria/recria uma sala fixa com código **`DEV001`** (3 pilotos: Ana/Bruno/Carla, 3 linhas de escala de 90min cada). **Usar esse código pra testar manualmente as próximas fases** em vez de criar sala nova toda hora — só rodar o seed de novo se precisar resetar o estado.

`server/.env` (gitignored, tem `DATABASE_URL="file:./dev.db"`) e `server/.env.example` (versionado, documenta as vars) já existem — se `server/.env` não existir numa sessão nova, copiar de `.env.example` antes de rodar qualquer comando `prisma`.

Monorepo funcionando: `npm install` na raiz resolve as 3 workspaces, `npm run dev:server` sobe Express+Socket.IO em `:4001` (`/health` OK), `npm run dev:web` sobe o Next.js em `:3000` com tema escuro e fontes Fira Sans/Fira Code aplicadas (confirmado via curl + inspeção do CSS compilado). Detalhes técnicos importantes descobertos nesta fase:

- **Next.js 16 / React 19 / Tailwind v4** foram instalados (últimas versões disponíveis, não Next 14 como o pedido original sugeriu — sem problema, só significa: `params` de rota dinâmica é `Promise` em Server Components (usar `await params` ou, em Client Component, o hook `useParams()` — mais simples pro nosso caso já que a página da sala precisa ser client component por causa do socket). Tailwind v4 não usa `tailwind.config.ts` — os tokens de cor/fonte ficam em `web/app/globals.css` via `@theme inline`, já configurados lá com os nomes `bg-bg`, `bg-surface`, `text-text-muted`, `text-status-ok/warning/critical`, `border-border`, `font-sans`, `font-mono` etc. **Usar essas classes, não inventar cor nova.**
- `@lmu/shared` é consumido como TS puro via symlink de workspace (sem build step em dev) — `server` usa `tsx` (que transpila on-the-fly) e `web` precisa de `transpilePackages: ["@lmu/shared"]` no `next.config.ts` (já configurado).
- `create-next-app` roda o `npm install` respeitando o workspace raiz automaticamente (detectei que ele instalou em `/node_modules` da raiz, não em `web/node_modules` — comportamento correto do npm workspaces, só documentando pra não estranhar).
- Lembrar de sempre matar os processos de dev (`next dev` / `tsx watch`) ao terminar de testar — eles não morrem sozinhos com `timeout`+`&` em background do jeito que rodei aqui.

`docs/telemetry-api.md` e `docs/design-system.md` já existem e devem ser respeitados (não redecidir cores/tipografia nem reinventar a estratégia de telemetria — já está pesquisado e documentado lá).

Repositório git: local, inicializado, remoto configurado como `origin` → `git@github.com:Vinii225/lemans-ultimate.git` (o usuário faz o `push` quando quiser — **nunca dar push sem pedir**, combinado no início do projeto).

Decisão do usuário sobre deploy: **eu (Claude) NÃO tenho e não devo tentar obter credenciais de Vercel/Supabase/Railway.** O trabalho é construir tudo localmente, testável localmente, e escrever um guia de deploy (`DEPLOY.md`, Fase 16) para o usuário publicar sozinho.

---

## Decisões de arquitetura (não redecidir — só ajustar se algo se provar inviável)

### Stack final

- **Monorepo com npm workspaces**, 3 pacotes: `shared/`, `server/`, `web/`.
- **`shared/`**: pacote TypeScript só com tipos (`Room`, `Driver`, `ScheduleRow`, eventos de socket, etc). Único lugar onde o formato dos dados é definido — server e web importam de lá (`@lmu/shared`). Evita duplicar/dessincronizar tipos entre front e back.
- **`server/`**: Node + Express + **Socket.IO** (tempo real) + **Prisma ORM**.
  - Por quê Socket.IO próprio em vez de Supabase Realtime: o usuário disse que vai fazer o deploy ele mesmo depois e eu não tenho como criar/testar contas Supabase agora. Um backend Node+Socket.IO+Prisma roda 100% local sem nenhuma conta externa, o que permite construir E TESTAR tudo nesta fase de desenvolvimento. Isso também é uma das opções que o próprio usuário sugeriu ("Railway/Render se preferir um backend Node próprio com Socket.IO"). Se no futuro quiserem migrar pra Supabase Realtime, a lógica de domínio (regras de negócio) fica isolada em `server/src/rooms/` e não depende de Socket.IO diretamente o suficiente pra facilitar a troca depois.
  - Banco: Prisma com **SQLite em dev** (zero setup, arquivo local em `server/prisma/dev.db`, já no `.gitignore`) e **Postgres em produção** (troca de `provider` no `schema.prisma` + `DATABASE_URL`, documentado no `DEPLOY.md` da Fase 16).
- **`web/`**: **Next.js 14 (App Router) + TypeScript + Tailwind CSS**, cliente `socket.io-client`, estado local com **Zustand** (simples, sem boilerplate de Redux, funciona bem pra "estado da sala espelhado do servidor").
- **Identidade sem cadastro**: ao entrar numa sala, o navegador gera um `userId` (uuid) salvo em `localStorage` junto com o nome escolhido, por sala (`lmu:sessions` → `{ [inviteCode]: { userId, name } }`). Isso permite reconectar/dar F5 sem perder "quem eu sou" nem duplicar usuários na lista de presença.
- **Servidor é a fonte da verdade**: toda edição (célula da planilha, log de combustível, etc) é um evento de socket validado no servidor, persistido via Prisma, e só depois retransmitido (`io.to(roomId).emit(...)`) pra todo mundo — inclusive pra quem editou (evita bug de estado local dessincronizar do banco). Sem CRDT/OT: como é "todo mundo edita, equipe pequena e confiável", **last-write-wins** por linha/campo é suficiente, com `updatedBy` + `updatedAt` gravados a cada mutação pra dar rastreabilidade (o "editado por Fulano há 5s" pedido no requisito).
- **Presença (quem está conectado)** é efêmera, mantida em memória no servidor (`Map<roomId, Map<socketId, {userId, name, color}>>`), reconstruída a cada conexão — não precisa de tabela no banco.

### Modelo de dados (Prisma — detalhar de verdade na Fase 2, isto é o esqueleto)

```
Room          { id, inviteCode(unique), name, car, track?, raceDurationType(TIME|LAPS), raceDurationValue,
                raceStartedAt?, currentLap?, position?, lastLapTime?, bestLapTime?, gapAheadSec?, gapBehindSec?,
                settingsJson (maxStintMinutes, minRestMinutes, tireDegradationCurve, pitActionDurations),
                createdAt, updatedAt }
Driver        { id, roomId, name, colorHex, createdAt }
ScheduleRow   { id, roomId, order(Float), plannedLabel, driverId?, status(PLANNED|ACTIVE|DONE), durationMinutes,
                notes, updatedBy, updatedAt }
PitStop       { id, roomId, lap?, fuelAddedLiters?, tireChangeCompound?, driverChangeToId?, repairsJson?,
                durationSeconds?, createdBy, createdAt }
FuelEntry     { id, roomId, lap, litersUsed?, litersRemaining?, source(MANUAL|TELEMETRY), createdBy, createdAt }
TireEntry     { id, roomId, compound, stintStartLap, ageLaps, wearPercent?, source(MANUAL|TELEMETRY), createdBy, createdAt }
DamageEntry   { id, roomId, part, severity(LIGHT|MODERATE|SEVERE), repairEstimateMinutes?, source, createdBy, createdAt }
Alert         { id, roomId, type, message, severity(INFO|WARNING|CRITICAL), createdAt, dismissedAt? }
```

`order` como `Float` (não int) pra permitir reordenar linhas da planilha inserindo entre duas existentes (`(a+b)/2`) sem ter que renumerar tudo a cada drag.

### Eventos de Socket.IO (nomenclatura — manter consistente)

Padrão: `domínio:ação`. Cliente emite, servidor valida+persiste+re-emite pra sala inteira via `broadcastToRoom`.

```
room:join          { inviteCode, userId?, name }   → ack com snapshot completo da sala + userId (novo ou reaproveitado)
room:state         (servidor → todos) snapshot completo, usado em reconexão
presence:update    (servidor → todos) lista atual de conectados
schedule:add / schedule:update / schedule:remove / schedule:reorder
fuel:log
tire:update / tire:newStint
damage:log
pitstop:start / pitstop:update / pitstop:complete
dashboard:update   (posição, volta, tempos — manual ou vindo de telemetry:push)
telemetry:push     { fields... }  (só do navegador com telemetria ativada, best-effort)
alert:new / alert:dismiss
```

### UI/Design

Já decidido e documentado em `docs/design-system.md` (gerado com a skill `ui-ux-pro-max`, instalada globalmente): dark-only, paleta com status ok/aviso/crítico, tipografia Fira Sans + Fira Code, planilha inline-editável. **Sempre seguir esse arquivo** ao construir qualquer tela — não escolher cor/fonte "no olho" numa fase e outra diferente na próxima.

---

## Fases

Cada fase tem: objetivo, arquivos principais, critério de pronto (algo que dá pra verificar sozinho, sem depender do usuário rodar nada). Marque `[x]` ao concluir.

### [x] Fase 0 — Fundamentos
- Pesquisa da API local da LMU → `docs/telemetry-api.md`.
- Design system gerado com a skill `ui-ux-pro-max` → `docs/design-system.md`.
- Este arquivo de roadmap.
- Git local inicializado, remoto `origin` configurado (sem push).

### [x] Fase 1 — Scaffold do monorepo
Objetivo: estrutura de pastas, workspaces, TypeScript, lint, Next.js e servidor rodando localmente (mesmo que só com telas/rotas placeholder).

Arquivos principais:
- `package.json` raiz com `"workspaces": ["shared", "server", "web"]`.
- `shared/package.json`, `shared/src/index.ts` (tipos iniciais: `Room`, `Driver`, `ScheduleRow`, enums).
- `server/package.json`, `server/tsconfig.json`, `server/src/index.ts` (Express + Socket.IO, rota `GET /health`, CORS liberado pra origem do `web` em dev).
- `web/` criado via `create-next-app` (TypeScript, Tailwind, App Router, sem `src/` — decidir e manter consistência, ou com `src/`, tanto faz, só documentar aqui o que foi escolhido), com tema escuro fixo no `<html data-theme="dark">` e fontes do design system carregadas.
- `.gitignore` raiz cobrindo `node_modules`, `.next`, `server/prisma/dev.db`, `.env*`.
- `README.md` raiz com instruções de `npm install` + como rodar `web` e `server` em dev (duas portas).

Critério de pronto:
- `npm install` na raiz resolve as 3 workspaces sem erro.
- `npm run dev --workspace=server` sobe o Express e `curl http://localhost:PORT/health` responde 200.
- `npm run dev --workspace=web` sobe o Next.js e a home carrega no navegador (ou via `curl` retorna HTML) com fundo escuro.

### [x] Fase 2 — Schema Prisma + migrations
- `server/prisma/schema.prisma` com o modelo completo (ver seção acima, refinado).
- `npx prisma migrate dev` gerando a primeira migration, SQLite local funcionando.
- `server/src/db.ts` exportando um `PrismaClient` singleton.
- Script de seed opcional (`server/prisma/seed.ts`) criando uma sala de teste com 2 pilotos e algumas linhas de escala, útil pra testar as fases seguintes sem recriar dados manualmente toda hora.

Critério de pronto: `npx prisma studio` (ou uma query simples num script) mostra as tabelas criadas e o seed populado.

### [x] Fase 3 — Camada de tempo real (join/create/rehydrate/presença)
- `server/src/rooms/roomService.ts`: criar sala (gera `inviteCode` único, ex. 6 chars alfanuméricos maiúsculos sem O/0/I/1 ambíguos), buscar sala por código, montar snapshot completo pra rehydrate.
- `server/src/socket/index.ts`: handler de conexão, `room:join`, presença em memória, `disconnect` limpando presença e emitindo `presence:update`.
- `web/src/lib/socket.ts`: cliente socket.io singleton.
- `web/src/hooks/useRoomSocket.ts` (ou store Zustand `web/src/state/roomStore.ts`): conecta, faz join, guarda snapshot, escuta `room:state`/`presence:update`.
- Fluxo de identidade: helper `web/src/lib/identity.ts` lendo/gravando `localStorage` (`userId`+`name` por `inviteCode`).

Critério de pronto: abrir a mesma sala em duas abas do navegador com nomes diferentes → cada uma aparece na lista de presença da outra em tempo real, e dar F5 numa aba não duplica o usuário nem perde o nome.

### [x] Fase 4 — Landing: Nova Sala / Entrar em Sala
- `web/app/page.tsx`: dois cards grandes — "Criar nova sala" (form: nome da corrida, carro, duração — tempo ou voltas) e "Entrar em sala" (campo de código, campo de nome).
- Ao criar: chama o servidor (REST simples `POST /rooms` ou evento de socket `room:create`), recebe `inviteCode`, navega pra `web/app/room/[code]/page.tsx`.
- Tela de erro amigável se o código não existir.

Critério de pronto: fluxo completo manual — criar sala, copiar link/código, abrir em outra aba (simulando outro dispositivo), entrar com nome, ver os dois conectados.

### [x] Fase 5 — Layout raiz da sala
- Shell da página da sala: header fixo (nome da corrida, indicador "ao vivo" pulsante, avatares de presença, código/link de convite com botão copiar), grid de cards responsivo pro resto do conteúdo.
- Aplicar tokens do `docs/design-system.md` via `tailwind.config.ts` (cores, fontes).
- Componente `EditedByBadge` reutilizável (nome + tempo relativo, atualiza sozinho a cada poucos segundos).

Critério de pronto: layout responsivo verificado em 375/768/1024/1440 (resize manual do navegador ou devtools), sem scroll horizontal na página.

### [x] Fase 6 — Dashboard geral
- Card com tempo decorrido/restante (calculado a partir de `raceStartedAt` + duração — funciona tanto por tempo quanto por voltas), posição, última volta, melhor volta, gaps.
- Indicador de janela de pit aberta/fechada (baseado em regra simples configurável por enquanto, refinada na Fase 9/11).
- "Quem está pilotando agora" puxado da linha `ACTIVE` da planilha de escala (depende da Fase 7 pra funcionar de verdade — pode ficar com placeholder até lá).
- Lista de conectados (reaproveita presença da Fase 3).

Critério de pronto: editar manualmente posição/volta numa aba reflete instantaneamente noutra aba aberta na mesma sala.

### [x] Fase 7 — Planilha de escala (feature central)
Esta é a mais importante — capriche.

- Componente `ScheduleSheet` em `web/components/schedule/` (repo não usa pasta `src/`, ver Fase 1): tabela com colunas horário/faixa de voltas, piloto (select), status, duração (min), observações, e uma coluna de ações (mover cima/baixo, remover). **"Duplicar" foi cortado do escopo** — não estava no pedido original do usuário, só era uma ideia minha no rascunho deste roadmap; adicionar só se pedirem.
- Edição inline célula-a-célula (clicar → editar → Enter confirma e desce pra célula de baixo, Esc cancela) — sem modal.
- Reordenação: setas cima/baixo (mínimo garantido, funciona em touch) + drag-and-drop opcional como melhoria (usar `@dnd-kit/core` se der tempo; não é bloqueante).
- Linha atual (`status=ACTIVE`) destacada; concluídas (`DONE`) esmaecidas + riscadas.
- Painel de totais por piloto (soma de `durationMinutes` das linhas dele, planejado vs. já `DONE`), comparando com `maxStintMinutes`/`minRestMinutes` das configurações da sala e sinalizando violação.
- Alerta visual se `soma(durationMinutes de todas as linhas) != duração total da corrida` (falta ou sobra cobertura).
- Toda mutação emite o evento de socket correspondente (`schedule:add/update/remove/reorder`) e grava `updatedBy`/`updatedAt` por linha, mostrado via `EditedByBadge`.
- Botão "abrir em tela cheia" (modal ou rota dedicada `web/app/room/[code]/schedule/page.tsx`).

Critério de pronto: com duas abas abertas, editar uma célula numa aba aparece na outra em <1s sem F5; reordenar numa aba reflete a nova ordem na outra; totais por piloto batem com a soma manual.

### [x] Fase 8 — Gestão de combustível
- Form rápido "registrar volta": litros usados na última volta (ou litros restantes lidos direto).
- Cálculo: consumo médio (média móvel das últimas N voltas, configurável), litros restantes estimados, voltas restantes com o combustível atual.
- Calculadora "quero completar X voltas → quantos litros abastecer" (usa consumo médio atual).
- Alerta (integra com Fase 13) quando voltas restantes de combustível < voltas até o fim da janela de pit planejada.

Critério de pronto: registrar consumo numa aba atualiza estimativas em todas as abas; calculadora bate com a conta manual (litros = voltas_desejadas × consumo_médio - litros_atuais, nunca negativo).

### [x] Fase 9 — Gestão de pneus
- Composto atual + idade em voltas (incrementa a cada volta registrada, manual ou telemetria).
- Curva de degradação configurável (ex. array de pontos `{lap, gripPercent}` ou uma fórmula linear simples com parâmetro de "queda por volta" editável nas configurações da sala) → recomendação textual de troca.
- Histórico de stints por jogo de pneu (composto, voltas rodadas, quando trocou).

Critério de pronto: trocar composto numa aba zera a idade e cria uma entrada no histórico, visível em todas as abas.

### [x] Fase 10 — Danos
- Form rápido: parte do carro (select: aero dianteira/traseira, suspensão, freios, motor, câmbio, carroceria...), severidade (leve/moderado/severo).
- Estimativa de tempo de reparo e impacto no ritmo por severidade (valores configuráveis nas settings da sala).
- Lista de danos ativos, com botão "marcar como reparado" (fica no histórico).

Critério de pronto: registrar dano numa aba aparece em todas, some do "ativo" e vai pro histórico ao marcar reparado.

### [ ] Fase 11 — Planejador de pit stop
- Checklist do próximo pit: combustível (litros), pneu (composto ou "mesmo"), troca de piloto (puxa direto da próxima linha `PLANNED` da escala), reparos pendentes (puxa da Fase 10).
- Soma os tempos configurados de cada ação → estimativa de tempo total parado.
- Botão grande "Iniciar pit stop" → "Concluir pit stop" (grava duração real, `lap`, o que foi feito) → aparece no histórico de pit stops da sala.
- Ao concluir com troca de piloto, marca a linha da escala correspondente como `DONE` e a próxima como `ACTIVE` automaticamente.

Critério de pronto: fluxo completo start→complete numa aba atualiza escala, dashboard ("quem está pilotando") e histórico em todas as abas.

### [ ] Fase 12 — Timeline visual
- Linha do tempo horizontal (ou vertical em mobile) mostrando janelas de pit e trocas de piloto planejadas (da escala) vs. executadas (dos pit stops reais), com marcador de "agora".

Critério de pronto: timeline reflete visualmente os dados já existentes das Fases 7 e 11 sem duplicar estado (deriva, não guarda cópia).

### [ ] Fase 13 — Sistema de alertas
- Motor de regras simples rodando no servidor (ou client, decidir na hora — servidor é mais confiável pra "todo mundo recebe igual") verificando periodicamente: combustível baixo, pneu no fim da vida, piloto perto do limite de stint, chegada na janela de pit, stint da planilha prestes a começar (ex. faltam 2 min pro horário previsto da próxima linha `PLANNED`).
- `alert:new` broadcast pra sala inteira; componente de toast/banner no `web` com cor por severidade (tokens já definidos no design system).
- Alertas críticos exigem dispensa manual (clique), os demais podem auto-esconder.

Critério de pronto: forçar uma condição (ex. reduzir combustível manualmente abaixo do limite) dispara o alerta em todas as abas conectadas.

### [ ] Fase 14 — Integração de telemetria (best-effort, client-side)
Seguir `docs/telemetry-api.md` à risca — não inventar campos, parser tolerante.

- Toggle "Conectar telemetria local" na UI (só visível/relevante pra quem está no PC do jogo).
- `web/src/lib/telemetry/lmuClient.ts`: fetch periódico (ex. a cada 2s) pra `http://localhost:6397/...`, com timeout curto e fallback de host (`localhost` → `127.0.0.1`).
- Parser defensivo (todos os campos opcionais, nunca lança erro que derruba a UI).
- Ao conseguir ler dados, emite `telemetry:push` pro servidor, que atualiza os campos relevantes da sala (com `source: 'telemetry'`) e re-emite normalmente — assim quem não tem telemetria também se beneficia.
- Indicador visível "Telemetria conectada" (verde) / "Modo manual" (neutro) / "Falha ao conectar" (aviso, com o texto de ajuda sobre mixed content do `docs/telemetry-api.md`).
- **Nunca bloquear a sala** se a telemetria falhar — é estritamente aditiva.

Critério de pronto: com o jogo fechado (ambiente sem LMU), o toggle tenta conectar, falha de forma clara e visível, e a sala continua 100% funcional em modo manual. (Teste real com o jogo rodando fica a cargo do usuário, que tem o jogo instalado — documentar isso claramente pro usuário quando chegar nesta fase.)

### [ ] Fase 15 — Exportação
- Botão "Exportar corrida" (JSON completo da sala + CSV da planilha de escala final, no mínimo).
- Endpoint `GET /rooms/:id/export` no servidor, gerando os arquivos a partir do estado persistido (não do estado em memória do cliente, pra garantir consistência).

Critério de pronto: exportar gera um JSON válido com todas as entidades da sala e um CSV abrindo corretamente numa planilha (Excel/Sheets/LibreOffice).

### [ ] Fase 16 — Polish final + guia de deploy
- Passar o checklist de acessibilidade/responsividade do `docs/design-system.md` em todas as telas.
- Revisar estados vazios (sala nova sem nenhum dado em cada módulo) e estados de erro (socket caiu, reconectando...).
- Indicador de reconexão automática do socket (Socket.IO já reconecta sozinho — só precisa refletir isso na UI: "reconectando...").
- `DEPLOY.md`: passo a passo pro usuário publicar sozinho — `web` na Vercel (variável de ambiente com a URL do servidor de socket), `server` no Railway/Render (com Postgres gerenciado deles, trocando o `provider` do Prisma e rodando `prisma migrate deploy`). Sem eu tocar em nenhuma conta.

Critério de pronto: `DEPLOY.md` é seguível do zero por alguém que nunca viu o projeto.

---

## Coisas para lembrar entre sessões (não redescobrir)

- Usuário fala português; responder em português.
- Skill `ui-ux-pro-max` está instalada globalmente (`~/.claude/plugins/marketplaces/ui-ux-pro-max-skill/...`) mas só carrega automaticamente em sessões **novas** do Claude Code (a sessão que a instalou não a viu na lista). Se o comando `Skill` com nome `ui-ux-pro-max` falhar de novo com "Unknown skill", rodar o `search.py` diretamente:
  ```
  python3 ~/.claude/plugins/marketplaces/ui-ux-pro-max-skill/.claude/skills/ui-ux-pro-max/scripts/search.py "<query>" --domain <domain>
  ```
- Remoto git já existe: `git@github.com:Vinii225/lemans-ultimate.git`. **Nunca dar `git push` sem o usuário pedir explicitamente** — combinado no início do projeto (2026-08-25).
- Não implementar hierarquia de permissões/papéis — decisão explícita do usuário pra v1 ("todo mundo edita").
- Telemetria é opcional e best-effort por design — nunca fazer nada da Fase 14 virar bloqueante de outra fase.
