import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const css = readFileSync(new URL("../../src/app/globals.css", import.meta.url), "utf8");

test("o sistema expoe os contratos de leitura, movimento e raio", () => {
  for (const token of [
    "--reading-measure: 68ch",
    "--motion-fast: 120ms",
    "--motion-base: 180ms",
    "--motion-slow: 240ms",
    // A escala de raio. Foi 0.5rem na identidade e-ink, depois 0 no KROS/DOS
    // (que negava a curva inteira), e agora e uma escala curta de papel. O que
    // este contrato guarda nao e o VALOR e sim a existencia dos tres tokens:
    // enquanto eles existirem, `check-retro-geometry.mjs` pode exigir que todo
    // raio da interface passe por eles em vez de ser valor solto.
    "--radius-control: 2px",
    "--radius-surface: 3px",
    "--radius-hero: 4px",
  ]) {
    assert.match(css, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
});

test("clinical reading is left aligned, capped at the measure, and stays serif", () => {
  const readingRule = css.match(/\.paper-reading\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(readingRule, /max-width:\s*var\(--reading-measure\)/);
  assert.match(readingRule, /text-align:\s*left/);
  assert.doesNotMatch(readingRule, /justify/);
  // A prosa declara a serifa explicitamente. Isto era CRITICO quando
  // `--font-sans` apontava para a mono -- sem a linha, o enunciado clinico
  // virava monoespacado em silencio. Hoje o sans e humanista e a falha seria
  // menos grave, mas a assercao fica: a serifa no enunciado e escolha de
  // leitura (§5.2), nao consequencia de qual fonte o chrome usa.
  assert.match(readingRule, /font-family:\s*var\(--font-serif\)/);
});

test("desenho nunca e caractere", () => {
  // Regua e' border, medidor e' cor, barra e' cor. Um leitor de tela le "▓▓▓▓"
  // como "sombreado escuro" quatro vezes, e a unica forma de isso nao acontecer
  // e o caractere nunca existir — nem no CSS, nem no markup.
  //
  // A regra atravessou as duas identidades sem mudar; o que mudou foi so o
  // desenho por tras dela (o medidor era segmentado, agora e chapado).
  assert.doesNotMatch(css, /content:\s*["'][^"']*[─-╿▀-▟]/);

  const meterRule = css.match(/\.paper-meter\s*>\s*\*\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(meterRule, /background:\s*var\(--meter-color/);

  // O medidor e' de VALOR e nao anima sozinho: so a largura transiciona quando
  // a medida muda. Barra que anda sem a medida mudar e' espera, e espera tem
  // classe propria (`.load-bar`).
  assert.doesNotMatch(meterRule, /animation:/);
});

test("o escuro nao pinta sombra sobre fundo escuro", () => {
  const darkBlock = css.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.match(darkBlock, /--overlay-shadow:\s*none/);
});

test("o escuro ancora na marca, e a marca passa no contraste", () => {
  // Este par vivia dentro do teste de sombra e nao tinha relacao com ele: era a
  // cor da identidade KROS/DOS (#FFB000, ambar de CRT) fixada de carona. Agora
  // mede o que o nome diz. O valor sai do teal da marca, clareado ate passar
  // 4,5:1 contra o fundo escuro mais claro dos tres -- `check-contrast-tokens`
  // e quem manda no digito, este teste so impede a ancora de sumir.
  const darkBlock = css.match(/\.dark\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  // O HEX SAIU DAQUI, e o próprio comentário acima já dizia por quê: quem manda
  // no dígito é o `check-contrast-tokens`, que mede o valor contra todos os
  // fundos. Este teste fixava #38A096 e passou a reprovar quando a paleta subiu
  // de luminância — reprovando uma mudança que o gate de contraste tinha
  // aprovado. Dois guards discordando sobre o mesmo número, e o mais burro
  // ganhando. O que ele protege é a ÂNCORA existir, não qual é o teal.
  assert.match(darkBlock, /--color-primary:\s*#[0-9A-Fa-f]{6}/);
  assert.match(darkBlock, /--color-primary-ink:\s*#0F1112/i);
});

test("carregamento tem UMA linguagem: barra continua e campo vazio silencioso", () => {
  // O que este teste impede e a volta dos QUATRO dialetos que conviviam aqui:
  // 204 skeletons pulsando, 25 `animate-pulse`, um quadrado girando e meia
  // duzia de "Carregando..." em texto puro. Cada um dizia a mesma frase de um
  // jeito diferente.
  //
  // O vocabulario mudou com a identidade — a barra era segmentada (a receita do
  // 98.css) e o campo vazio era reticula de 1px; agora sao continua e chapado.
  // A PROPRIEDADE protegida e a mesma: uma linguagem so, e nada que finja
  // atividade.

  // 1. A barra e cor chapada na marca, nunca imagem nem gradiente decorativo.
  const fillRule = css.match(/\.load-bar__fill\s*\{([\s\S]*?)\}/)?.[1] ?? "";
  assert.match(fillRule, /background:\s*var\(--color-primary\)/);
  assert.doesNotMatch(fillRule, /url\(/);

  // 2. So o INDETERMINADO anima. Barra com percentual conhecido nao anima: a
  //    largura ja carrega a informacao e movimento em cima dela atrapalha.
  assert.match(css, /\.load-bar__fill--indeterminate\s*\{[\s\S]*?animation:\s*load-bar-sweep/);
  assert.doesNotMatch(fillRule, /animation:/);

  // 3. A varredura usa `transform`, nao `background-position`: transform nao
  //    provoca repintura de layout, e pode haver varias barras na tela.
  assert.match(css, /@keyframes load-bar-sweep\s*\{[\s\S]*?translateX/);

  // 4. O campo vazio se assume vazio: superficie chapada, sem animacao nenhuma.
  //    O respiro de opacidade que ja esteve aqui simulava conteudo chegando —
  //    a mentira do placeholder moderno, e o §8.4 so permite animacao que
  //    EXPLICA.
  const skeletonRule = css.match(/\.paper-skeleton\s*\{([\s\S]*?)\n  \}/)?.[1] ?? "";
  assert.match(skeletonRule, /background-color:\s*var\(--color-surface-muted\)/);
  assert.doesNotMatch(skeletonRule, /animation/);
  assert.doesNotMatch(css, /paper-skeleton-breathe/);

  // 5. O cursor de bloco piscando saiu com o terminal, e nao pode voltar de
  //    carona num componente novo.
  assert.doesNotMatch(css, /chrome-cursor/);
});
