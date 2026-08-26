# LMU Local REST API — pesquisa e estratégia de integração

> Pesquisado em 2026-08-25 via web search (sem acesso ao jogo rodando). **Antes de implementar/ajustar o parser de verdade (Fase 13), quem tiver o jogo instalado deve abrir `http://localhost:6397/swagger/index.html` com o LMU rodando e conferir os endpoints/campos reais.** Este documento é o ponto de partida, não a verdade absoluta — o parser deve ser tolerante a campos ausentes/renomeados desde o início.

## O que sabemos com razoável confiança

- Base URL local: `http://localhost:6397` (herdado do stack rFactor2, plugin `rFactor2SharedMemoryMapPlugin` / webserver interno do jogo).
- **Existe um Swagger UI vivo**: `http://localhost:6397/swagger/index.html` (e provavelmente `http://localhost:6397/swagger/v1/swagger.json` para o spec em JSON). Isso é a fonte de verdade — deveria ser a primeira coisa a checar quando alguém for validar a integração com o jogo real.
- Endpoints citados por devs da comunidade (fórum oficial + repositórios que integram com LMU):
  - `GET /rest/sessions/getAllVehicles` — lista de carros instalados (dado estático, não é telemetria de corrida).
  - `GET /rest/strategy/usage` — histórico de "Virtual Energy" (combustível/energia) por volta. Útil para o módulo de combustível.
  - `GET /rest/garage/UIScreen/RepairAndRefuel` — dados de peças "wearable" (aero, freios, suspensão) usados na tela de reparo/reabastecimento do box. Útil para o módulo de danos.
- Quirk relatado: em alguns setups, `localhost` falhou por resolução IPv6 e `http://[::1]:6397/...` funcionou. Vale ter fallback tentando `127.0.0.1` e `localhost` em sequência.

## O que NÃO sabemos ainda (pesquisar/validar com o jogo rodando)

- Endpoint de **scoring ao vivo por carro** (posição, volta atual, última volta, melhor volta, gaps, nome do piloto, número de pit stops) — ferramentas "sérias" de telemetria (ex. `NikMusy/le-mans-ultimate-telemetry`, `Swizzjack/lmu-pitwall`) usam principalmente **Shared Memory** (`$rFactor2SMMP_Telemetry$` / `$rFactor2SMMP_Scoring$`), que só é acessível por processo nativo (ctypes/Rust), **não por fetch de navegador**. Isso significa que nossa integração via browser fica limitada ao que a REST API HTTP realmente expõe — pode ser mais pobre do que o ideal.
- Nomes exatos de campos JSON em cada endpoint (não confirmados por documentação oficial).
- Se existe algum endpoint tipo `/rest/watch` (comum em forks antigos de rF2) ativo na build atual da LMU.

## Risco técnico importante: mixed content (HTTPS → HTTP localhost)

Nossa aplicação será hospedada em HTTPS (Vercel). Fazer `fetch()` de uma página `https://` para `http://localhost:6397` **pode ser bloqueado pelo navegador como "mixed content"**, dependendo do browser/versão. Como o requisito do usuário já prevê que essa integração é best-effort e pode falhar, a UI deve:

1. Tentar o fetch com timeout curto (ex. 2s).
2. Se falhar, mostrar claramente "Telemetria: não foi possível conectar (localhost:6397)" com um link de ajuda explicando:
   - Confirmar que o jogo está aberto e em uma sessão.
   - No Chrome: `chrome://settings/content/insecureContent` → adicionar o domínio do app à lista "permitir" (allow insecure content), ou clicar no cadeado da barra de endereço → "Configurações do site" → permitir conteúdo não seguro.
   - Tentar `127.0.0.1` como alternativa a `localhost`.
3. Nunca travar a sala — cair em "Modo manual" automaticamente.

## Estratégia de parsing (Fase 13)

- Um único módulo `web/src/lib/telemetry/lmuClient.ts` isolando toda a lógica de fetch/parse.
- Tipos TypeScript com **todos os campos opcionais** (`field?: number`), nunca assumir presença.
- Função `parseVehicleScoring(raw: unknown): PartialTelemetrySnapshot` que faz parsing defensivo (checagem de tipo em cada campo, `try/catch` por endpoint) e loga (só em modo debug) campos inesperados para facilitar ajuste futuro sem quebrar a sala.
- Cada campo derivado da telemetria no estado da sala carrega `source: 'telemetry' | 'manual'` e `updatedAt`, para a UI poder mostrar "via telemetria" vs "manual" e o usuário sempre poder sobrescrever manualmente.
- Endpoints a tentar, nesta ordem de prioridade (ajustar depois de checar o Swagger real):
  1. `/rest/strategy/usage` → combustível/energia por volta.
  2. `/rest/garage/UIScreen/RepairAndRefuel` → danos.
  3. Investigar Swagger para achar o endpoint de posição/volta/gap — placeholder até lá.

## Referências

- Fórum oficial (thread sobre REST API): https://community.lemansultimate.com/index.php?threads/rest-api-documentation.3278/
- https://github.com/Swizzjack/lmu-pitwall (Rust bridge + React/PWA, usa `/rest/strategy/usage` e `/rest/garage/UIScreen/RepairAndRefuel`)
- https://github.com/NikMusy/le-mans-ultimate-telemetry (usa Shared Memory, não REST — referência de quais campos existem no jogo, mesmo que não via HTTP)
- https://lemansultimate.wiki.gg/wiki/Telemetry
