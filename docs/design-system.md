# Design System — LMU Race Engineer

Gerado com a skill `ui-ux-pro-max` (estilo `Data-Dense Dashboard` + `Dark Mode OLED`, densidade 9/10, motion 3/10) e ajustado manualmente para semântica de corrida (status ok/aviso/crítico). Fonte de verdade única para todas as fases de UI — não redecidir cores/tipografia por página.

## Tema

Dark-first, **sem modo claro na v1** (o pedido do usuário é "tema escuro por padrão" — vamos fixar dark para reduzir escopo; `color-scheme: dark` no root).

## Tokens de cor (CSS variables / Tailwind)

```css
--bg:              #020617;  /* slate-950 — fundo da página */
--surface:         #0E1223;  /* cards/painéis */
--surface-raised:  #1A1E2F;  /* elementos dentro de cards, hover de linha */
--border:          #334155;  /* slate-600 — bordas sutis */
--text:            #F8FAFC;  /* texto principal */
--text-muted:      #94A3B8;  /* labels, timestamps, texto secundário */

--brand:           #3B82F6;  /* azul — ações primárias, foco, indicador "ao vivo" */
--brand-fg:        #0B1220;

--status-ok:       #22C55E;  /* verde — combustível/pneu/dano OK */
--status-warning:  #F59E0B;  /* âmbar — atenção, janela de pit próxima */
--status-critical: #EF4444;  /* vermelho — crítico, alerta ativo */

--ring:            #3B82F6;  /* outline de foco, 2px, offset 2px */
```

Regra: nunca usar hex cru dentro de componente — sempre var/token Tailwind (`bg-surface`, `text-status-critical`, etc). Contraste mínimo 4.5:1 para texto normal (7:1 quando possível, dado ambiente de baixa luz).

## Tipografia

- **UI / texto corrido:** Fira Sans (400/500/600/700).
- **Dados tabulares / planilha / tempos de volta / números:** Fira Code (400/500/600) — `font-variant-numeric: tabular-nums` em qualquer número que muda com frequência (evita "pulo" visual).
- Google Fonts import:
  ```
  https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600;700&family=Fira+Sans:wght@300;400;500;600;700&display=swap
  ```
- Escala: base 16px, `line-height: 1.5` em texto corrido. Em cards densos pode cair para 1.35–1.4. Nunca abaixo de 12px para texto legível (labels pequenos toleram 12–13px).
- Números grandes de destaque (ex. litros restantes, posição): 28–40px, Fira Code, weight 600.

## Layout & densidade

- Grid de cards com `gap` pequeno (8–16px) — densidade 9/10, mas nunca a ponto de alvo de toque < 44×44px (botões de ação continuam grandes, densidade se aplica a texto/tabelas, não a controles tocáveis).
- Breakpoints: 375px (celular), 768px (tablet), 1024px, 1440px+ (monitor de sim-racing). Mobile-first, sem scroll horizontal na página (tabelas/planilha rolam dentro do próprio container).
- Planilha de escala (feature central): container com `overflow-x: auto` isolado, linha atual destacada com borda esquerda `--brand` + fundo `--surface-raised`, linhas concluídas com `opacity: 0.55` + `line-through` nos campos de piloto/horário.

## Componentes-chave

- **Card/Painel**: `bg-surface`, `border border-border`, `rounded-lg`, padding 12–16px, título em maiúsculas pequenas + `text-muted`.
- **Badge "editado por"**: pill pequena, `text-muted`, formato "✎ {nome} · {tempo relativo}" — atualiza tempo relativo ao vivo (ex. "há 5s" → "há 1min"), sem emoji como ícone funcional (usar SVG se precisar de ícone, texto "✎" aqui é tipográfico, ok como glifo neutro — revisar se preferir ícone lucide `pencil`).
- **Indicador de presença**: avatares circulares com iniciais, cor determinística por nome (hash → paleta de 8 cores de acento), tooltip com nome completo. Ponto verde pulsante "ao vivo" quando socket conectado.
- **Toast/Alerta**: cantos superiores (desktop) / topo full-width (mobile), cor de borda = severidade (`status-warning`/`status-critical`), ícone SVG, auto-dismiss configurável exceto críticos (exigem clique).
- **Célula de planilha inline-editável**: `contenteditable` ou input transparente que assume o layout da célula ao focar; `Enter` confirma e move pra célula de baixo (padrão planilha), `Esc` cancela, `Tab` move pra direita. Estado "salvando..." sutil (ponto pulsante) e depois "salvo" fade-out.
- **Botão de ação primária grande** (registrar volta, iniciar pit, trocar piloto): altura mínima 48px, `bg-brand text-brand-fg`, cantos arredondados, ocupam largura total em mobile.

## Motion

- Sutil (nível 3/10): transições 150–300ms `ease-out` em hover/estado; sem animações de entrada elaboradas. Respeitar `prefers-reduced-motion` (desativa qualquer transição não essencial).
- Atualizações em tempo real (nova linha, valor mudou): flash sutil de fundo (`--surface-raised` por 400ms) para chamar atenção sem ser irritante em atualizações frequentes.

## Checklist de entrega (aplicar em toda tela nova)

- [ ] Sem emoji como ícone funcional (usar SVG — lucide-react)
- [ ] `cursor-pointer` em todo clicável
- [ ] Contraste de texto ≥ 4.5:1 (ideal 7:1 dado uso em ambiente escuro)
- [ ] Foco visível (outline 2px `--ring`, offset 2px) — nunca `outline: none` sem substituto
- [ ] Alvos de toque ≥ 44×44px
- [ ] Responsivo em 375/768/1024/1440
- [ ] `prefers-reduced-motion` respeitado
