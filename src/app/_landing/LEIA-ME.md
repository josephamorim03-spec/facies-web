# `_landing/` — os blocos da home

**Esta é a home.** `../page.tsx` renderiza `Pagina` daqui desde 02/09/2026.

A pasta começa por `_`, então o App Router nunca a transforma em rota: a página
é a rota, e isto são os blocos dela, colocados ao lado de quem os usa. É a regra
do `web/CLAUDE.md` — *"keep page files thin"*.

A versão anterior da home (404 linhas, estrutura v7 numerada `01`…`05`) está em
`git show <commit-da-promoção>~1:krosmed/web/src/app/page.tsx`, e os componentes
dela seguem no repositório, intactos: `FunilHome`, `SecaoAposta`,
`SecaoNoveMedidas`, `SecaoOndeEncaixa`, `SecaoSemLetraMiuda`, `RotuloSecao`.

## O que a v8 faz de diferente

A v7 argumentava por **objeção**, em seções numeradas. A v8 **demonstra a
jornada**: a cara da prova monta o caminho do aluno — cara → diagnóstico e mapa
→ sessão de hoje → revisão —, com a âncora e as objeções como apoio. Nesta
ordem:

| bloco | o trabalho dele |
| --- | --- |
| `Heroi` | a cara da prova + a busca, antes de qualquer scroll |
| `NoveMedidas` | o que se mede numa questão, com exemplo |
| `TrintaAssuntos` | o payload: a lista registrada antes da prova |
| `MapaDosAssuntos` | o mapa: a cara × o que você já sabe, e o que custa |
| `DepoisDeEntrar` | a sessão de hoje: 3 passos + captura do /hoje |
| `CursinhoOuFacies` | a âncora — contra mentoria, não contra banco de questões |
| `Objecoes` | as quatro objeções reais |
| `Fecho` | a revisão da última semana, o e-mail, o compartilhamento |

## `dados.ts` é a razão de o porte existir

A peça em `web/design/facies-landing-v8.html` é HTML autocontido: cada número foi
copiado do dataset uma vez e **congelou**. Aqui cada afirmação tem caminho até a
fonte, e uma que perca o lastro vira erro de tipo ou `null` — não texto errado na
tela. Três coisas que isso já resolveu:

- **O contador de dias** era um script no cliente que envelhecia sozinho; virou
  `diasAte(prova.aplicacao_prevista)`, derivado no servidor.
- **O hash e a data do registro** passaram a usar `hashCurto()` e
  `dataDoRegistro()`, a mesma formatação do resto do produto.
- **As duas bases ficaram separadas.** `serie` (o que a prova cobra, 1.763) e
  `forma` (como ela cobra, 557) são campos distintos, cada um com o próprio `n`.
  Confundi-las foi o que produziu a afirmação frágil da primeira versão.

## Quatro coisas herdadas da home anterior

O porte não as tinha, e a página as pressupõe:

1. **`RedirectIfAuthenticated`** (em `../page.tsx`). Sem ele, quem já tem sessão
   aterrissa na página de venda em vez do app. É a única peça **funcional** da
   lista.
2. **`paper-page`** no `<main>`. Inverte papel e superfície — a landing é
   documento, o app é bancada — e traz a escala tipográfica medida do desenho.
3. **O preço**: R$ 490 no primeiro ano contra R$ 590. Decisão do operador em
   30/08, posterior ao "sem cifra" de 23/08 do briefing do desenho. Portar sem a
   cifra teria revertido em silêncio uma decisão de três dias antes.
4. **O rodapé** com a contagem de bancas.

## Duas armadilhas de CSS que a promoção descobriu

**A escala tipográfica não é do Tailwind.** `.paper-page h1:not(.paper-eyebrow)`
tem especificidade `0,2,1` e vence `text-[34px]` (`0,1,0`). As classes de tamanho
que este porte trazia nos títulos eram **inertes** — ficavam no DOM sem efeito na
folha. Foram removidas: h1 é 34/54/64, h2 é 24/34/38, h3 é fixo em 17, e isso vem
de `globals.css`, que é onde a spec medida do desenho mora.

**O gutter muda em 760px, não em 640.** O porte usava `px-5 sm:px-8`, e o `sm:`
do Tailwind é 640px — então entre 640 e 760 a landing teria 32px de margem
enquanto o `CabecalhoPublico` acima dela tinha 20px, desalinhando a wordmark do
conteúdo. Agora todos os blocos usam `px-[var(--gutter)]`, a mesma variável do
resto do site.

## O que continua fora, e por quê

- **A aba "A prova e você"** no mapa. O eixo do domínio só existe em `/mapa`,
  para quem tem conta: ele precisa de `dominio`, que vem de `competencyMastery`.
  Na peça era demonstração rotulada; aqui seria dado inventado.
- **Os três estados do mapa** (medido / estimado / não avaliado). O `MapaDaProva`
  não distingue medido de estimado, e `nao_avaliado` cai no piso de tinta —
  visualmente idêntico a "você vai muito bem aqui". Corrigir é mudar o componente
  de **produção**; fazer aqui criaria a segunda cópia.
- **A questão real nas nove medidas.** A questão é sintética. Trocá-la depende de
  confirmar procedência: as 30 do ebook vêm do lote `estrategia-med-…`, e o
  raio-x marca 8.157 questões de agregador com `bloqueia_publicacao: true`.

## Antes de mexer

```
npm run typecheck
npm run lint
NODE_OPTIONS=--max-old-space-size=2048 npm run build
node design/verificar-landing-v8.mjs
```

O `--max-old-space-size` **menor** não é engano: o erro do build é
`vips_tracked: out of memory`, memória **nativa** do libvips, e um heap V8 maior
rouba endereçamento dela. Está registrado em `krosmed-build-precisa-de-heap-maior`.
