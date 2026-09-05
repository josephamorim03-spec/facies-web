import type { Metadata } from "next";

import { CentralDeEscolhas } from "./CentralDeEscolhas";
import { CursinhoOuFacies } from "./CursinhoOuFacies";
import { Fecho } from "./Fecho";
import { Heroi } from "./Heroi";
import { MapaDosAssuntos } from "./MapaDosAssuntos";
import { NoveMedidas } from "./NoveMedidas";
import { Objecoes } from "./Objecoes";
import { OQueVoceRecebe } from "./OQueVoceRecebe";
import { AssuntosPrevistos } from "./AssuntosPrevistos";
import { dadosDaLanding } from "./dados";
import { DepoisDeEntrar } from "@/components/facies/DepoisDeEntrar";
import { CONT_LANDING, SITE_NAME, SITE_QUALIFICADOR } from "@/lib/site";


/**
 * A metadata da landing — o cartão do link.
 *
 * ## Por que ela vive AQUI, e não solta
 *
 * O tráfego deste produto vem de compartilhamento, e link sem cartão morre em
 * grupo: vira uma URL azul que ninguém abre. A home ANTERIOR declarava
 * `openGraph` **sem `images`** e não havia `opengraph-image` na raiz — só em
 * `app/prova/[slug]/`. Ou seja: justamente a página que se compartilha era a
 * que chegava sem imagem. Corrigido na promoção.
 *
 * ⚠️ NÃO declaro `openGraph.images` à mão. A convenção do App Router detecta
 * `app/opengraph-image.png` sozinha — e o PNG já está lá. Conferido no build:
 * a home emite `og:image`, `width`, `height`, `type`, `alt` e
 * `twitter:card summary_large_image`, e `/prova/[slug]` mantém o cartão
 * dinâmico dele (a convenção da raiz só cascateia onde não há um mais próximo).
 *
 * ## O título lidera com o termo de busca
 *
 * Regra que o `layout.tsx` já aplica: "quem busca digita 'raio-x da prova USP'",
 * e o template `%s · Fácies` mantém a marca no fim, onde ela identifica sem
 * competir. A home ANTERIOR omitia `title` de propósito e herdava o default — o que
 * deixava a palavra que a pessoa digita, ENAMED, fora do título.
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
    // ⚠️ A MARCA VEM ESCRITA AQUI, e não do template do layout.
    // `title.template` do App Router NÃO se aplica ao segmento onde é definido:
    // `layout.tsx` e esta página dividem `app/`, então o `%s · Fácies` que dá
    // "Termos de Uso · Fácies" em /termos não toca a home. Medido no build: sem
    // esta linha o título sai "O que cai no ENAMED, medido questão por questão",
    // sem marca nenhuma — na aba do navegador e no resultado de busca.
    title: `O que cai no ${prova.sigla}, medido questão por questão · ${SITE_NAME}`,
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
 * ## PROMOVIDA. Esta é a home.
 *
 * `src/app/page.tsx` renderiza este componente desde 02/09/2026. O arquivo
 * continua se chamando `Pagina.tsx` numa pasta `_privada` — que o App Router
 * nunca transforma em rota — porque a página é a rota e isto são os blocos
 * dela, colocados ao lado de quem os usa.
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
    /* `paper-page` NAO e cosmetico, e a landing nao renderiza certo sem ele.
       Ele faz duas coisas que esta pagina pressupoe:

       1. INVERTE papel e superficie. A landing e documento (papel claro com
          blocos assentados); o app e bancada (tela mais escura com fichas
          claras). Sem a classe, `bg-paper` e `bg-surface` destes blocos pegam
          os valores do app e a pagina inteira sai com o contraste trocado.
       2. Traz a ESCALA TIPOGRAFICA medida do desenho: h1 34/54/64, h2 24/34/38,
          h3 fixo em 17. Ela vence por especificidade (0,2,1 contra 0,1,0), entao
          as classes `text-*` que este porte trazia nos titulos eram inertes --
          ficavam no DOM sem efeito na folha. Foram removidas na promocao. */
    <main className="paper-page pb-0">
      <Heroi dados={dados} />
      <CentralDeEscolhas dados={dados} />
      <NoveMedidas
        contexto={{
          pctEsperado: dados.forma.assinatura?.pct_esperado ?? null,
          pctMedido: dados.forma.assinatura?.pct_estrato ?? null,
          baseFormato: dados.forma.base.n,
        }}
      />
      <AssuntosPrevistos dados={dados} />
      <MapaDosAssuntos dados={dados} />

      {/* A sessão de hoje — a cara vira a rotina. A única imagem da página,
          com dados de exemplo e regerável via `gerar-captura-produto.mjs`. */}
      <section className="border-t border-rule py-14 sm:py-24">
        <div className="mx-auto w-full max-w-[1080px] px-[var(--gutter)]">
          <DepoisDeEntrar />
        </div>
      </section>

      <OQueVoceRecebe />
      <CursinhoOuFacies dados={dados} />
      <Objecoes dados={dados} />
      <Fecho dados={dados} />

      {/* Rodape: identificacao, e mais nada. A clausula legal vive no
          `TermsModal`; fechar a pagina com ressalva gasta a ultima linha
          desfazendo o que as outras construiram. Herdado da home anterior --
          o porte nao tinha rodape, e a pagina terminava no bloco petroleo sem
          dizer quem a assina nem sobre quantas bancas ela fala. */}
      <footer className={`${CONT_LANDING} border-t border-rule py-8 text-sm text-muted`}>
        <p>
          {SITE_NAME} · {SITE_QUALIFICADOR} ·{" "}
          <span className="font-mono tabular-nums">{dados.provasComFacies}</span> provas analisadas
        </p>
      </footer>
    </main>
  );
}
