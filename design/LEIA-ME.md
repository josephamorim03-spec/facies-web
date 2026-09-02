# `facies-landing-v8.html` — peça de design, não página em produção

Um HTML autocontido, para aprovar no navegador antes de virar código. A home no
ar continua sendo [`src/app/page.tsx`](../src/app/page.tsx), com a estrutura da
v7. Nada aqui foi aplicado lá.

```
node design/verificar-landing-v8.mjs     # as afirmações contra o dataset
npm run verificar:design                 # os pixels contra o desenho (a v7)
```

## Por que existe um verificador só para ela

Cada número da peça foi copiado de `src/data/facies/*.json` uma vez e ali
congelou. O dataset é regerado com frequência, e quando ele muda a página não
reclama — ela só passa a mentir. Foi o que aconteceu duas vezes durante o
desenho, e as duas foram pegas por leitura humana, não por guard:

1. A página afirmava *"nenhuma das 100 questões pede a alternativa incorreta"*
   ao lado de um método que dizia `n = 1.763`. Verdadeira, e medindo 5,7% da
   série — fina demais, e por isso soava falsa. A base certa para **formato** são
   as **557 questões classificadas** da família ENARE/ENAMED, não as 100 da
   edição direta.
2. Números de maquete da v7 — *"48 palavras por enunciado"*, *"81% do top-30"* —
   não têm campo correspondente em lugar nenhum do dataset, e circularam como se
   fossem medição.

O verificador falha se qualquer um dos dois voltar.

## As duas bases, que não podem se misturar

| pergunta | base | onde |
| --- | --- | --- |
| **o que** a prova pergunta | 1.763 questões, 9 aplicações | série composta do ENAMED |
| **como** a prova pergunta | 557 classificadas por formato | família ENARE/ENAMED |

## O esperado é padronização indireta

Da migration `129_form_standardized_by_institution.sql`:

```
esperado = SUM sobre estratos ( n_banca_estrato × taxa_nacional_estrato )
razao    = observado / esperado
```

Existe porque **assunto prediz forma**: Urgências Abdominais tem 35,2% de vinheta
longa e Epidemiologia 11,8%. Sem o ajuste, uma banca que cobra muito Trauma
pareceria "vinheta-pesada" sem ter escolhido nada sobre forma.

Por isso o esperado sai quebrado (42,9): é soma de produtos, não contagem. E é
por isso que a página **não** compara com a média nacional crua.

⚠️ A invariante da 129 — razão global = 1,0000 — vale sobre as **267 bancas do
acervo**. No dataset publicado são 138, um subconjunto filtrado, e ela dá 0,87.
Quem tentar conferi-la por `facies.json` vai concluir errado que o esperado está
quebrado. O teste em `kbank/tests/` é a autoridade.

## Exceções deliberadas, para ninguém "corrigir" depois

- **A palavra "cara" destacada na manchete** (Source Serif 4 em `#12786E`)
  contraria o briefing, que proíbe destacar uma palavra do título em outra cor.
  Foi pedido, e o gesto repete o logotipo — que é Source Serif com o "á" nessa
  mesma cor. A serifa leva `font-size:1.12em` porque a altura-de-x dela é 91
  contra 102 da Instrument Sans: **medido**, não estimado.
- **A questão do bloco das nove medidas é sintética**, escrita para a peça e
  rotulada como tal. As 30 questões reais do ebook vêm do lote
  `estrategia-med-…`, e o raio-x marca 8.157 questões de procedência de agregador
  com `bloqueia_publicacao: true`. Trocar por uma questão real é uma linha,
  quando a procedência for confirmada.
- **A aba "A prova e você"** não existe em produção: o eixo do domínio só aparece
  em `/mapa`, para quem tem conta. Aqui é demonstração, e a tela diz isso.
- **Os três estados do mapa** (medido / estimado / não avaliado) seguem o
  artboard, e não o `MapaDaProva`, que não distingue medido de estimado. Ver a
  pendência abaixo.
- **Sem preço**, por decisão de 23/08: oferta vincula (CDC art. 30) e o checkout
  não abriu. Diverge do `page.tsx` no ar, que anuncia preço futuro no cartão de
  acesso.

## Pendências que são de produção, não da peça

1. **`leitura` não é sensível à direção.** A conclusão *"ler o comando tem retorno
   real aqui"* é colada sem condição: sai igual para quem usa a pegadinha 2,5×
   **mais** que o país e para quem usa 14× **menos**. Medido: **53 das 82** bancas
   que exibem a medida recebem a conclusão invertida. Diagnóstico e patch em
   [CORRIGIR-leitura-invertida.md](CORRIGIR-leitura-invertida.md).
2. **A home não tem `opengraph-image`.** Existe em `app/prova/[slug]/` e em
   `.../revisao-final/`, mas não na raiz — justamente a página que se compartilha.
   **APLICADO.** O cartão está em `src/app/opengraph-image.png` (1200×630, 52 KB),
   com `opengraph-image.alt.txt` ao lado. A convenção do App Router o detecta e
   passa a injetar `og:image` em toda rota que não tenha o seu — inclusive a home.

   Escolhi PNG **estático** e não uma rota `ImageResponse`: o build já morreu por
   memória nativa do libvips gerando OpenGraph em 330 páginas, e um arquivo não
   custa nada no build. Não movi porque o efeito é mais amplo do que a home —
   pela convenção do App Router, toda rota sem `opengraph-image` própria passa a
   herdar este. É melhor que cartão nenhum, mas é decisão sua, e eu não consigo
   rodar o build aqui para conferir.

   Conferido no tamanho em que ele é realmente visto: em 400px (largura típica do
   WhatsApp) a manchete e a faixa continuam legíveis, e legenda e selo degradam
   para textura em vez de virar ruído.

   ⚠️ O cartão usa `PALETA.MARCA` (`#0C8F7F`) de `lib/cartao.ts`, e **não** o
   `#12786E` da manchete da landing. São tokens diferentes de propósito: numa peça
   onde tudo é grande, o acento correto é o de display. Dois cartões do mesmo
   produto com verdes diferentes é o defeito que isso evita.

   ⚠️ Depois de mover, trocar o `og:image` da peça, que hoje aponta para o
   paliativo `/prova/enamed/opengraph-image`.
3. **As 42 atualizações clínicas estão sem acento.** *"PCDT Doenca Pulmonar
   Obstrutiva Cronica"*, *"criancas imunodeprimidas"*, *"cancer do colo do
   utero"* — 42 de 42, título e resumo. Não é encoding: os **subtemas do mesmo
   registro têm acento**, e o JSON preserva. A perda é na autoria da proposta.
   Numa página que se apoia em rigor, ao lado de uma portaria numerada, isso
   contradiz o que ela defende. Diagnóstico e correção em
   [CORRIGIR-atualizacoes-sem-acento.md](CORRIGIR-atualizacoes-sem-acento.md).
4. **O mapa não distingue medido de estimado**, e `nao_avaliado` cai no piso de
   tinta — visualmente idêntico a "você vai muito bem aqui". O componente
   compensa com uma frase; o desenho compensa com três formas.
5. **O gerador desta peça se perdeu** numa limpeza de diretório temporário. O
   único dado que envelhecia sozinho — "faltam N dias" — passou a se recalcular
   do `<time datetime>` na própria página. O resto exige regerar à mão.
