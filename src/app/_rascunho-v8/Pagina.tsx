import type { Metadata } from "next";

import { CursinhoOuFacies } from "./CursinhoOuFacies";
import { Fecho } from "./Fecho";
import { Heroi } from "./Heroi";
import { MapaDosAssuntos } from "./MapaDosAssuntos";
import { NoveMedidas } from "./NoveMedidas";
import { Objecoes } from "./Objecoes";
import { TrintaAssuntos } from "./TrintaAssuntos";
import { dadosDaLanding } from "./dados";


/**
 * A metadata da landing — o cartão do link.
 *
 * ## Por que ela vive AQUI, e não solta
 *
 * O tráfego deste produto vem de compartilhamento, e link sem cartão morre em
 * grupo: vira uma URL azul que ninguém abre. A home no ar hoje declara
 * `openGraph` **sem `images`**, e não existe `opengraph-image` na raiz — só em
 * `app/prova/[slug]/`. Ou seja: justamente a página que se compartilha é a que
 * chega sem imagem.
 *
 * Exportar daqui faz a promoção carregar isto junto: renomear este arquivo para
 * `page.tsx` basta.
 *
 * ⚠️ NÃO declaro `openGraph.images` à mão. A convenção do App Router detecta
 * `app/opengraph-image.png` sozinha, e apontar para um caminho que ainda não
 * existe é pior que não apontar. O cartão pronto está em
 * `web/design/opengraph-image.png`; movê-lo para `src/app/` liga tudo.
 *
 * ## O título lidera com o termo de busca
 *
 * Regra que o `layout.tsx` já aplica: "quem busca digita 'raio-x da prova USP'",
 * e o template `%s · Fácies` mantém a marca no fim, onde ela identifica sem
 * competir. A home de hoje omite `title` de propósito e herda o default — o que
 * deixa a palavra que a pessoa digita, ENAMED, fora do título.
 */
export function metadataDaLanding(): Metadata {
  const dados = dadosDaLanding();
  if (!dados) return {};
  const { prova, areas, forma, maiorAreaPassaDeUmTerco } = dados;
  const maior = areas[0];
  const razao = forma.padronizada?.razao ?? null;

  // A descrição carrega o FATO, não a categoria. Descrever a categoria ("mostra
  // a cara do ENAMED") faz menos gente abrir do que entregar o achado — e ela
  // sai do dado, então não envelhece sozinha como a da peça estática.
  const fato = maiorAreaPassaDeUmTerco
    ? `Mais de um terço do ${prova.sigla} é ${maior?.rotulo.toLowerCase()}`
    : `${maior?.pct}% do ${prova.sigla} é ${maior?.rotulo.toLowerCase()}`;
  const pegadinha = razao !== null && razao > 0.45 && razao < 0.55
    ? ", e a pegadinha de comando quase não existe."
    : ".";
  // ⚠️ TETO DE COMPRIMENTO, e ele não é estético: a busca corta perto de 160 e o
  // cartão do WhatsApp mostra ~2 linhas. A primeira versão tinha 234 e o que
  // caía fora era "Grátis, sem cadastro" — justamente o removedor de atrito.
  // O fato vem na frente; o que sobrevive ao corte é o que decide o clique.
  const descricao = `${fato}${pegadinha} Os `
    + `${dados.previsao?.itens.length ?? 30} assuntos registrados antes da prova. Grátis, sem cadastro.`;

  return {
    title: `O que cai no ${prova.sigla}, medido questão por questão`,
    description: descricao,
    alternates: { canonical: "/" },
    openGraph: {
      title: `A cara do ${prova.sigla}, medida questão por questão`,
      description: descricao,
      url: "/",
    },
  };
}
/**
 * A landing v8, composta.
 *
 * ## Não é `page.tsx` de propósito
 *
 * Este arquivo se chama `Pagina.tsx` e vive numa pasta `_privada`: o App Router
 * ignora as duas coisas, então nada aqui vira rota. Promover é renomear o
 * arquivo para `page.tsx` e a pasta para o caminho desejado.
 *
 * ## O que ainda falta, e por quê
 *
 * Dois blocos da peça não estão aqui:
 *
 * - **As nove medidas com a questão anotada.** A questão da peça é SINTÉTICA, e
 *   trocá-la por uma real depende de confirmar a procedência: as 30 do ebook vêm
 *   do lote `estrategia-med-…`, e o raio-x marca 8.157 questões de agregador com
 *   `bloqueia_publicacao: true`. Portar com a sintética é possível; portar com a
 *   real é uma linha depois da confirmação.
 * - **O mapa dos assuntos.** Ele deve REUSAR `MapaDaProva`, que já existe e já
 *   recebe `linhas` e `preOrdenado`. O que a peça acrescenta são os três estados
 *   do artboard (medido / estimado / não avaliado), que o componente ainda não
 *   distingue — e isso é mudança no componente de produção, não no rascunho.
 *
 * Os dois estão documentados em `LEIA-ME.md`, com o motivo de cada um.
 */
export function Pagina() {
  const dados = dadosDaLanding();

  // Sem prova no dataset a página não tem o que afirmar. Renderizar um esqueleto
  // com zeros seria pior que não renderizar: a peça inteira existe para dizer
  // números, e número ausente não pode virar "0".
  if (!dados) return null;

  return (
    <main>
      <Heroi dados={dados} />
      <NoveMedidas
        contexto={{
          pctEsperado: dados.forma.assinatura?.pct_esperado ?? null,
          pctMedido: dados.forma.assinatura?.pct_estrato ?? null,
          baseFormato: dados.forma.base.n,
        }}
      />
      <TrintaAssuntos dados={dados} />
      <CursinhoOuFacies dados={dados} />
      <MapaDosAssuntos dados={dados} />
      <Objecoes dados={dados} />
      <Fecho dados={dados} />
    </main>
  );
}
