# Rascunho do porte da landing v8

**Não é rota.** Pasta iniciada por `_` é privada no App Router — o Next nunca a
transforma em URL. O código é compilado pelo `typecheck` e não é alcançável nem
por acidente. Promover é renomear a pasta.

A home no ar continua sendo [`../page.tsx`](../page.tsx), intocada.

## O que já está aqui, e por que é a parte que importa

[`dados.ts`](dados.ts) — a derivação. **Passa no `npm run typecheck`.**

A peça em `web/design/facies-landing-v8.html` é um HTML autocontido: cada número
foi copiado do dataset uma vez e congelou. Portar sem esta camada seria levar o
congelamento junto. Aqui cada afirmação tem caminho até a fonte, e uma que perca
o lastro vira erro de tipo ou `null` — não texto errado na tela.

Três coisas que a derivação já resolve:

- **O contador de dias.** Na peça estática ele envelhecia sozinho, e virou um
  script no cliente. Aqui é `diasAte(prova.aplicacao_prevista)`, que já existia
  em `lib/provas.ts`: some do cliente e passa a ser derivado no servidor.
- **O hash e a data do registro.** `hashCurto()` e `dataDoRegistro()` já existem
  em `lib/previsao.ts` — a página deixa de carregar string solta e passa a usar a
  mesma formatação do resto do produto.
- **As duas bases separadas.** `serie` e `forma` são campos distintos, cada um
  com o próprio `n`. Foi confundi-las que produziu a afirmação frágil da primeira
  versão do desenho.

## O que falta, e o que é reuso

O porte é sobretudo **reuso**: a peça reproduziu à mão componentes que já existem.

| bloco da peça | no porte |
| --- | --- |
| cabeçalho | `CabecalhoPublico` — já existe |
| busca + atalhos | `BuscaDeProva` — já existe, com teclado e `aria-activedescendant` |
| mapa dos assuntos | `MapaDaProva` — já existe, e o `Serie` dele é a mesma barra |
| faixa de áreas | `FaixaAreas` — já existe |
| grade de cem quadrados | novo, pequeno |
| questão + nove medidas | novo — ver a decisão abaixo |
| cursinho × Fácies, FAQ, fecho | novos, sem estado |

## A decisão que o porte precisa tomar antes de escrever JSX

A peça usa **interação só com CSS** (`input[type=radio]` + `:has()`), o que a faz
funcionar sem JS. O código do app usa `useState` em componente `"use client"` —
é o que `MapaDaProva` faz.

As duas são defensáveis e não dá para misturar sem a página ficar incoerente:

- **Manter CSS puro.** A landing é a primeira dobra do funil e funciona sem JS;
  `:has()` é suportado em tudo hoje. Custa divergir do padrão do repositório.
- **Converter para estado.** Casa com `MapaDaProva` e com o resto do app, e
  permite `aria-expanded`/`aria-live` de verdade. Custa exigir JS para a leitura
  interativa — o conteúdo continua aparecendo, mas a demonstração morre.

Recomendo **CSS puro no herói** (a grade de áreas, que é leitura) e **estado nos
dois blocos de demonstração** (a questão e o mapa), reusando `MapaDaProva` no
segundo. Não escrevi o JSX porque essa escolha muda a estrutura dos dois, e é
decisão de arquitetura, não de desenho.


## Renderizado e conferido (não só typecheck)

Os sete blocos foram renderizados em 390 e 1280px, sem transbordo horizontal:
7 seções, 100 quadrados no herói, 8 células no mapa, zero erro de runtime.

Duas coisas que só o render mostrou:

1. **A grade das áreas estourava de altura.** No celular os filhos usam
   posicionamento explícito (`col-start`, `row-start`, `col-span-full`) e no
   desktop eu resetava só `sm:col-auto sm:row-auto`. Não basta: `col-span-full`
   define `grid-column: 1 / -1` — início **e** fim —, então o filho continuava
   preso à linha inteira e o número caía numa linha própria. O reset correto é
   `sm:[grid-area:auto]`, que zera os quatro. Typecheck e guards passavam com o
   layout quebrado; só o render mostrou.

2. **O middleware manda tudo para `/login`.** Só `PUBLIC_EXACT` e
   `PUBLIC_PREFIXES` (`lib/rotasPublicas.ts`) escapam — foi por isso que a
   primeira captura veio com a tela de login e zero seções. Ao promover, a
   landing tem de ficar em `/`, que está em `PUBLIC_EXACT`: em qualquer outro
   caminho ela nasce inacessível para quem não tem sessão, que é justamente o
   público dela.

## Uma divergência de vocabulário a decidir

O `BuscaDeProva` real rotula o botão **"Ver a cara da prova"**; a peça estática
diz "Ver a fácies da prova". Com a manchete agora em "cara", o rótulo do
componente é o mais coerente dos dois — mas peça e componente precisam
convergir, e mudar o componente é produção.

## O cartão do link vive no porte

`Pagina.tsx` exporta `metadataDaLanding()`. Promover é renomear o arquivo para
`page.tsx` — a metadata vai junto.

Ela é **derivada**: título, descrição e OpenGraph saem do dataset, então não
congelam como os da peça estática. Três decisões dentro dela:

- **O título lidera com o termo de busca.** A home no ar omite `title` de
  propósito e herda o default do layout — o que deixa fora do título justamente
  a palavra que a pessoa digita: ENAMED. Aqui ele entra, e o template
  `%s · Fácies` mantém a marca no fim, onde identifica sem competir.
- **A descrição tem teto de comprimento.** A busca corta perto de 160 e o cartão
  do WhatsApp mostra ~2 linhas. A primeira versão saiu com **234**, e o que caía
  fora era *"Grátis, sem cadastro"* — o removedor de atrito. Hoje são **152**, e
  o verificador reprova se voltar a estourar.
- **`openGraph.images` não é declarado à mão.** A convenção do App Router
  detecta `app/opengraph-image.png` sozinha. Mover o cartão pronto de
  `web/design/opengraph-image.png` para `src/app/` liga tudo; apontar para um
  caminho que ainda não existe seria pior que não apontar.

## Antes de promover

1. Renomear a pasta (`_rascunho-v8` → o nome da rota) ou mover o conteúdo para
   `page.tsx`.
2. `npm run typecheck && npm run lint`
3. `npm run build` — a memória `krosmed-build-precisa-de-heap-maior` registra
   **duas** mortes por memória com consertos opostos; vale ler antes.
4. `node design/verificar-landing-v8.mjs` deixa de valer para a página portada:
   ele lê o HTML estático. O equivalente aqui é o `typecheck` mais um teste que
   fixe as invariantes de copy — que as áreas somem 100, que a maior passe de um
   terço enquanto a frase disser "mais de um terço".
