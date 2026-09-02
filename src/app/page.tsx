import type { Metadata } from "next";

import { RedirectIfAuthenticated } from "./_components/RedirectIfAuthenticated";
import { Pagina, metadataDaLanding } from "./_landing/Pagina";

/**
 * A home É a Fácies — landing v8.
 *
 * Server component e estática: nenhuma consulta ao banco em tempo de
 * requisição. O tráfego é pico de WhatsApp, e a primeira impressão do funil
 * inteiro não pode ser uma tela de erro.
 *
 * ## Por que este arquivo é fino
 *
 * A composição vive em `_landing/Pagina.tsx`. Pasta iniciada por `_` é privada
 * no App Router: ela nunca vira rota, e os blocos ficam colocados ao lado da
 * página que os usa em vez de espalhados por `components/`. A regra do
 * `web/CLAUDE.md` — *"keep page files thin"* — é o motivo.
 *
 * ## O que esta versão troca, e o que ela CARREGA da anterior
 *
 * A v7 argumentava por seções numeradas (`01`…`05`) e por objeção. A v8
 * argumenta por demonstração: a cara da prova em cem quadrados, as nove
 * medidas, os trinta assuntos registrados antes da prova, o mapa, e só então
 * as objeções. Os números não são mais escritos à mão — `_landing/dados.ts`
 * os deriva do dataset, e uma afirmação que perca a fonte vira erro de tipo em
 * vez de texto errado na tela.
 *
 * Quatro coisas da home anterior foram trazidas de propósito, porque o porte
 * não as tinha e a página as pressupõe:
 *
 * 1. **`RedirectIfAuthenticated`**, aqui embaixo. Sem ele, quem já tem sessão
 *    aterrissa na página de venda em vez do app. É a única peça FUNCIONAL da
 *    lista — as outras três são conteúdo.
 * 2. **`paper-page`** no `<main>` (dentro de `Pagina`), que inverte papel e
 *    superfície e traz a escala tipográfica medida do desenho.
 * 3. **O preço.** R$ 490 no primeiro ano contra R$ 590 — decisão do operador em
 *    30/08, posterior ao "sem cifra" de 23/08 que o briefing do desenho
 *    registrava. Portar sem a cifra teria revertido em silêncio uma decisão de
 *    negócio de três dias antes. Está em `_landing/MapaDosAssuntos.tsx`, com o
 *    porquê inteiro.
 * 4. **O rodapé** com a contagem de bancas.
 *
 * A versão anterior está em `git show HEAD~1:krosmed/web/src/app/page.tsx` —
 * e os componentes dela (`FunilHome`, `SecaoAposta`, `SecaoOndeEncaixa`,
 * `SecaoSemLetraMiuda`) continuam no repositório, intactos.
 *
 * ## A metadata é derivada
 *
 * `generateMetadata` e não um objeto literal: título, descrição e OpenGraph
 * saem do dataset, então não congelam. O cartão do link vem da convenção de
 * arquivo — `app/opengraph-image.png` é detectado sozinho, e por isso
 * `openGraph.images` NÃO é declarado à mão.
 */
export function generateMetadata(): Metadata {
  return metadataDaLanding();
}

export default function Home() {
  return (
    <>
      <RedirectIfAuthenticated />
      <Pagina />
    </>
  );
}
