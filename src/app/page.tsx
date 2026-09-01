import type { Metadata } from "next";
import Link from "next/link";
import { RedirectIfAuthenticated } from "./_components/RedirectIfAuthenticated";
import { FunilHome } from "./_components/FunilHome";
import { BuscaDeProva } from "@/components/facies/BuscaDeProva";
import { FaixaAreas } from "@/components/facies/FaixaAreas";
import { SecaoAposta } from "@/components/facies/SecaoAposta";
import { SecaoNoveMedidas } from "@/components/facies/SecaoNoveMedidas";
import { SecaoOndeEncaixa } from "@/components/facies/SecaoOndeEncaixa";
import { SecaoSemLetraMiuda } from "@/components/facies/SecaoSemLetraMiuda";
import { RotuloSecao } from "@/components/facies/RotuloSecao";
import { bancasEmDestaque, todasAsBancas } from "@/lib/facies";
import { todasAsProvas } from "@/lib/provas";
import { revisaoPorExamKey } from "@/lib/revisao";
import { CONT_LANDING, SITE_NAME, SITE_QUALIFICADOR } from "@/lib/site";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";

/**
 * A home É a Fácies.
 *
 * Server component e estática: nenhuma consulta ao banco em tempo de requisição.
 * O tráfego é pico de WhatsApp e a primeira impressão do funil inteiro não pode
 * ser uma tela de erro.
 *
 * ## A ESTRUTURA É A DA v7, seção por seção
 *
 * A página foi recomposta na ordem do projeto de design
 * (`uploads/facies-landing-v7.html`), na direção **1b** — a faixa abre, e a
 * pergunta vem depois:
 *
 *   herói ······ faixa → pergunta → busca → mais buscadas → selo
 *   01 ········· a cara desta prova            (`PonteDiagnostico`, já existia)
 *   02 ········· nossa aposta, por escrito     (faixa petróleo)
 *   03 ········· o que ninguém mede            (as nove medidas)
 *   04 ········· onde isto se encaixa
 *   05 ········· sem letra miúda
 *   ············ o aviso, e o rodapé
 *
 * **A seção 06 (preço) existe em `SecaoPreco` e NÃO está montada** — mas o
 * preço voltou, dentro do cartão de acesso. A diferença é o que se promete:
 * `SecaoPreco` vende assinatura, e assinatura não abriu; o cartão anuncia um mês
 * gratuito e o preço FUTURO da coorte de lançamento, que o sistema cumpre hoje.
 *
 * ## O que saiu, e por quê
 *
 * As seções antigas ("o problema nunca foi falta de questão", "a leitura vira
 * rotina", "o que a Fácies é e o que não é", "quatro objeções") argumentavam
 * por OBJEÇÃO. A v7 argumenta por DEMONSTRAÇÃO: mostra a cara, aposta por
 * escrito, abre o método, e só então diz onde se encaixa. Manter as duas faria
 * uma página que responde perguntas que ela mesma não levantou.
 *
 * O cartão de acesso ficou, e é o único bloco fora da v7. Ele existe porque a
 * v7 pressupõe assinatura aberta e ela não está: sem ele, o pedido de e-mail no
 * fim não tem pergunta para responder.
 */

const DESCRICAO =
  "Toda prova tem uma cara. Veja como a sua banca cobra: o formato das questões, o que mais cai e a distribuição por área. Grátis, sem cadastro.";

export const metadata: Metadata = {
  // Sem `title` de propósito: a home herda o default do layout, que já é a
  // marca com o qualificador.
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_QUALIFICADOR}`,
    description: DESCRICAO,
    url: "/",
  },
};

/** O contêiner único da v7 vive em `@/lib/site` — as cinco seções usam o
 *  mesmo, e era a repetição do literal que as deixava 56px mais estreitas. */
const CONT = CONT_LANDING;

export default function Home() {
  const destaques = bancasEmDestaque();
  const provaEmDestaque = todasAsProvas()[0];
  const total = todasAsBancas().length;
  const revisao = provaEmDestaque ? revisaoPorExamKey(provaEmDestaque.exam_key) : undefined;

  /**
   * ══ A NUMERAÇÃO DAS SEÇÕES VIVE AQUI, e em nenhum componente ═══════════════
   *
   * Cada seção trazia o próprio número escrito à mão, e a página abria em **02**.
   * O 01 era do `PonteDiagnostico`, que saiu do fluxo — e ninguém renumerou,
   * porque não havia onde: o número morava dentro do componente removido. O
   * leitor via 02, 03, 04, 05 e um bloco sem rótulo no fim, numa página cuja
   * forma inteira é a de documento numerado.
   *
   * Agora a ordem é esta lista, e o número é a POSIÇÃO nela. Remover uma seção
   * renumera as outras sozinho; acrescentar uma no meio também. É a mesma
   * disciplina que `medidasDaQuestao.ts` já aplica às nove medidas, e pelo mesmo
   * motivo: numeração escrita duas vezes é numeração que diverge.
   *
   * A seção da aposta é condicional (depende de haver prova em destaque), então
   * ela entra na lista só quando entra na página — senão o buraco voltaria pela
   * outra porta.
   *
   * ⚠️ `SecaoPreco` continua FORA: ela é a seção de VENDA, e não há checkout
   * para vender. O preço anunciado no cartão de acesso é outra coisa — condição
   * futura, não oferta de compra agora. Quando `SecaoPreco` montar, entra aqui
   * no fim e recebe o número que sobrar.
   */
  const ordem = [
    "cara",
    ...(provaEmDestaque ? ["aposta"] : []),
    "medidas",
    "encaixa",
    "letra-miuda",
    "acesso",
  ];
  const numeroDa = (chave: string) => {
    const posicao = ordem.indexOf(chave);
    // Chave fora da lista é erro de programação, não estado possível. Rótulo
    // vazio é melhor que numeração inventada — e some sem quebrar a linha.
    return posicao < 0 ? "" : String(posicao + 1).padStart(2, "0");
  };

  return (
    <>
      <RedirectIfAuthenticated />

      {/* `paper-page` inverte papel e superfície: a landing é documento
          (papel claro com blocos assentados), o app é bancada (tela mais escura
          com fichas claras por cima). Os dois vêm do projeto de design — os
          artboards do webapp concordam com o app, só a landing inverte. */}
      <main className="paper-page pb-0">
        {/* O CABEÇALHO FICA FORA DO HERÓI, e isso não é detalhe de marcação.
            Ele estava dentro do `.sec`, herdando o `padding-block` de 96px do
            ritmo de seção — então a página abria com quase 120px de nada antes
            da wordmark. O respiro de `--bloco` existe para separar SEÇÕES; o
            cabeçalho não é uma, é o topo do documento.

            E SEM `pt-*`: o `pt-3` que estava aqui punha 12px acima da wordmark
            que nenhuma outra página tem. `/facies`, `/facies/[banca]`, `/prova/
            [slug]` e o documento legal põem `<CabecalhoPublico />` como primeiro
            filho do `<main>`, com o `py-5` do próprio componente e mais nada.
            Navegar da home para a lista de bancas fazia a marca pular. O topo do
            documento é o mesmo em todo o funil público. */}
        <div className={CONT}>
          <CabecalhoPublico />
        </div>

        {/* `pt-8` e não `--bloco`: o herói já vem depois da régua do cabeçalho,
            e o respiro cheio de seção duplicaria a separação que a régua faz. */}
        <section className="pb-[var(--bloco)] pt-4">
          <div className={CONT}>
            {/* ── A FAIXA ABRE A PÁGINA — direção 1b ──────────────────────
                As outras duas direções (1a prontuário, 1c petróleo) penduram na
                primeira tela a frase "pesa N pontos a mais que na média das
                outras" — comparação com a média nacional que o próprio projeto
                de design proibiu num turno posterior. A 1b já nasce sem ela.

                O argumento da ordem: a página inteira afirma que provas têm
                caras diferentes. Abrir com a cara é mostrar a afirmação antes de
                fazê-la. */}
            {provaEmDestaque ? (
              <section aria-labelledby="abertura-faixa">
                <h2 id="abertura-faixa" className="paper-eyebrow">
                  {/* A BASE É A APLICAÇÃO DIRETA, e não a série inteira.
                      `areas.linhas` soma exatamente `base.direta.questoes`;
                      pendurar aqui o total da série faria a conta desmentir a
                      legenda em qualquer segmento.

                      ⚠️ E A FRASE PRECISA SER DIFERENTE da da seção 03. As duas
                      diziam "questões já analisadas" — aqui sobre 90, lá sobre
                      1.717. Mesma frase, dois números, na mesma página: lê como
                      erro, e quem duvida de um número duvida do resto. Aqui é a
                      aplicação; lá é a série. */}
                  {provaEmDestaque.sigla} · {provaEmDestaque.base.direta.questoes} questões
                  da aplicação
                  {provaEmDestaque.base.direta.anos.length === 1
                    ? ` de ${provaEmDestaque.base.direta.anos[0]}`
                    : ""}
                </h2>
                <FaixaAreas
                  className="mt-2"
                  altura="previa"
                  legenda
                  // "Peso por disciplina", e não "peso de cada área": "área" é a
                  // palavra do edital, e é exatamente a que faz o leitor esperar
                  // cinco fatias de 20%.
                  rotulo={`Peso por disciplina na ${provaEmDestaque.sigla}`}
                  linhas={provaEmDestaque.areas.linhas.map((linha) => ({
                    rotulo: linha.rotulo,
                    pct: linha.pct,
                  }))}
                />
              </section>
            ) : null}

            {/* A manchete é a que o guia de texto recomenda para o topo: "é a
                única que o leitor não consegue responder com segurança, e
                pergunta sem resposta prende".

                Sem classe de tamanho: a escala vive em `.paper-page h1`,
                com `font-size` e `line-height` no mesmo bloco. É o que impede a
                armadilha que já custou uma entrelinha de 1,0 em produção —
                `sm:text-5xl` carrega line-height junto e vence qualquer
                `leading-*` escrito ao lado. */}
            {/* `mt-4`, e nao `mt-10`. MEDIDO no artboard `1b`: entre a legenda
                da faixa e o `h1` o desenho tem vao ZERO — o titulo encosta no
                que acabou de ser mostrado, e e essa colagem que faz a faixa ler
                como assunto da manchete em vez de enfeite acima dela.

                Nosso vao era 40px, mais a nota do eixo entre os dois: quase 50
                pixels da primeira tela do celular gastos em nada, e foi disso
                que o usuario reclamou duas vezes. Nao vai a zero porque, ao
                contrario do desenho, existe a nota no meio e ela precisa nao
                grudar no titulo. */}
            <h1 className="mt-4 max-w-[16ch] font-serif font-semibold text-ink">
              Você sabe o que a sua prova cobra?
            </h1>

            {/* A CHAMADA É A DA v7, palavra por palavra. A que estava aqui
                ("Isto aí em cima é a cara do…") era paráfrase minha, escrita para
                amarrar a lede à faixa que a 1b põe acima. Ela funcionava, e custava
                o argumento: a da v7 nomeia as três medidas (peso por área, assunto
                que repete, como escreve) e fecha em "de graça, agora", que é a
                única promessa que a página pode cumprir na própria tela.

                O "Não “o que costuma cair em residência”" de abertura é o que
                separa a Fácies de cursinho na primeira linha lida. */}
            <p className="lede mt-3 text-muted sm:mt-5">
              Não “o que costuma cair em residência”. A{" "}
              <span className="text-marcaViva">sua</span> prova: quanto ela pesa em cada
              área, quais assuntos ela repete todo ano, e até como ela escreve as
              questões. Nós medimos isso questão por questão — e mostramos de graça,
              agora.
            </p>

            {/* A BUSCA, que faltava. O seletor de cartões abaixo mostra quatro
                provas em destaque e é ótimo nisso; o que ele não faz é achar a
                SUA entre 141. Quem presta a quinta lia que existe uma leitura
                da prova dele e não tinha como pedi-la — falha cara numa página
                cuja tese é "a sua prova". */}
            <BuscaDeProva />

            {/* A DICA DE ROLAGEM voltou. Eu a removi no porte, e ela não era
                decoração: quem chega por link compartilhado não sabe que a
                página continua. A v7 tem a mesma linha ("↓ a cara completa do
                ENAMED, logo abaixo") pelo mesmo motivo. */}
            {/* 24px, nao 40. O `1b` nao tem dica de rolagem nenhuma — ela e
                nossa, e continua valendo (quem chega por link compartilhado
                nao sabe que a pagina segue). Mas ela nao merece o maior vao do
                heroi. */}
            <p className="mt-6 flex items-center gap-2.5 text-sm text-muted">
              <span aria-hidden="true">↓</span>
              {provaEmDestaque
                ? `a cara completa do ${provaEmDestaque.sigla}, logo abaixo`
                : "a leitura completa, logo abaixo"}
            </p>

            {/* O SELO VOLTOU. Ele existia, e eu o perdi numa das reescritas do
                herói — o tipo de regressão que nenhum guard pega, porque
                remover conteúdo não quebra nada.

                A v7 tem `.selo-livre` e o artboard `1b` também, os dois em 11px
                mono. A posição é a do `1b`: por último, depois da busca. É a
                remoção de um obstáculo, e obstáculo só pesa depois de existir
                vontade — no topo ele responderia uma pergunta que o leitor
                ainda não fez. */}
            <p className="paper-eyebrow mt-4">grátis · sem cadastro</p>
          </div>
        </section>

        <FunilHome bancas={destaques} prova={provaEmDestaque} numero={numeroDa("cara")}>
          {/* As seções estáticas entram por dentro do funil e continuam sendo
              server components: um componente cliente envolvendo a página toda
              arrastaria para o bundle conteúdo que nunca muda. */}
          {provaEmDestaque ? (
            <SecaoAposta prova={provaEmDestaque} numero={numeroDa("aposta")} />
          ) : null}
          <SecaoNoveMedidas numero={numeroDa("medidas")} />
          <SecaoOndeEncaixa numero={numeroDa("encaixa")} />
          <SecaoSemLetraMiuda numero={numeroDa("letra-miuda")} />

          {/* ── O aviso ─────────────────────────────────────────────────
              Fora da v7, e de propósito. A v7 fecha em preço; aqui não há
              checkout, então o que fecha é o que É verdade hoje.

              "Em breve" não entra: promessa de prazo cria a mesma obrigação
              que o número criava. Este bloco é a pergunta ("o app ainda não
              está aberto") e o gate logo abaixo é a resposta ("saber quando
              abrir") — a adjacência é a razão da ordem. */}
          <section className="sec" id="aviso">
            <div className={CONT}>
              {/* O RÓTULO NUMERADO FALTAVA AQUI. Esta seção fechava a página com
                  um `<h2>` solto, sem o rótulo que todas as outras têm — e como
                  ela é a última, a numeração parecia terminar antes do fim. */}
              {/* "ACESSO" PROMETIA O QUE A SECAO NAO ENTREGA.
                  A ultima secao da pagina se chamava "Acesso" e a maior frase
                  dentro dela dizia que o acesso nao esta aberto. O leitor chega
                  ao fim, le o titulo como "aqui você entra", e recebe "ainda
                  nao". A chave interna continua `acesso` -- e a numeracao das
                  secoes com ela; o que muda e o que o leitor le. */}
              <RotuloSecao numero={numeroDa("acesso")}>como começar</RotuloSecao>
              <h2 className="mt-3 font-serif font-semibold text-ink">Como começar</h2>
              {/* A CENA DO PLANTÃO SAIU. Ela dizia "quem estuda em janela
                  irregular — plantão, pós-plantão, noite curta", e era o último
                  resto de uma página que se explicava pela rotina do leitor. A
                  v7 não faz isso: ela diz o que o produto É e deixa o leitor se
                  reconhecer sozinho.

                  O que fica é a cunha — para quem isto serve e para quem não —
                  que continua valendo porque poupa a leitura de quem não é
                  desta fase, e afasta quem pediria reembolso. */}
              <p className="max-w-[58ch] text-base text-muted">
                A Fácies é para quem está em{" "}
                <span className="text-ink">consolidação e revisão</span>, não em primeiro
                aprendizado. Questão não ensina do zero: a teoria vem de fora por desenho —
                você já tem o conteúdo, e a Fácies diz o que fazer com ele.
              </p>
              {/* O CARTAO ESTAVA INVERTIDO, e ele e a ultima coisa da pagina.
                  A linha grande dizia "o app ainda nao esta aberto para
                  assinatura" e a pequena dizia que a leitura e gratuita. Ou
                  seja: o maior tipo da ultima secao anunciava o que o leitor
                  NAO pode fazer, e o que ele pode fazer agora ficava em corpo
                  menor, abaixo.

                  Os dois fatos continuam na tela, e a protecao do art. 30
                  tambem -- nenhuma promessa de preco, de data ou de venda. O que
                  troca e qual das duas frases o leitor le primeiro e maior. */}
              {/* O PREÇO VOLTOU — e agora ele é sustentável.
                  O bloco anterior dizia que a assinatura "ainda não abriu" e
                  nada mais, porque anunciar preço de algo incomprável é oferta
                  que o art. 30 obriga a cumprir e não havia como cumprir.

                  O que mudou não foi o checkout: foi o que se anuncia. Agora a
                  página promete três coisas que o sistema JÁ cumpre hoje, sem
                  linha nova de cobrança:

                  1. um mês de acesso completo — `DIAS_DE_TRIAL = 30`, concedido
                     no primeiro login, automático;
                  2. sem cartão e sem cobrança automática — literalmente
                     verdade, não existe meio de pagamento armazenado em lugar
                     nenhum do sistema;
                  3. R$ 490 no primeiro ano para quem se cadastrar agora — a
                     coorte é `users.created_at`, que já grava quem entrou
                     quando. A promessa é honrável com dado que já existe.

                  Os dois valores são oferta vinculante (art. 30) por decisão do
                  operador em 2026-08-30. Mudá-los para cima quebra o vínculo com
                  quem leu — então eles não sobem sem que esta página deixe de
                  prometê-los ANTES.

                  ⚠️ Não transformar isto em contagem regressiva. A limitação é
                  dita UMA vez, aqui; o aviso de proximidade é da interface do
                  app, que já recebe `access_expires_at` em `GET /profile`. */}
              {/* O PLANO GRATUITO — questões + o ebook da Revisão Final.
                  Vem antes do cartão de trial de propósito: é a porta sem
                  cadastro e gratuita, e o trial (com conta + preço) é o passo
                  seguinte. O ebook é grátis por decisão de produto. */}
              {revisao ? (
                <div className="mt-6 rounded-surface border border-edge bg-surface p-5 sm:p-6">
                  <p className="paper-eyebrow">grátis · sem cadastro</p>
                  <p className="mt-3 text-base text-ink">
                    A última semana antes da {provaEmDestaque.sigla}.
                  </p>
                  <p className="mt-2 max-w-[58ch] text-sm text-muted">
                    A nossa aposta, transformada em questões de revisão: um assunto por dia,
                    com gabarito. Leia online ou baixe em PDF.
                  </p>
                  <div className="mt-5">
                    <Link
                      href={`/prova/${provaEmDestaque.slug}/revisao-final`}
                      className="paper-control inline-flex min-h-11 items-center rounded-surface border border-primary bg-primary px-4 py-2 text-sm font-medium text-primaryInk transition hover:brightness-[1.04]"
                    >
                      Abrir a Revisão Final
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="mt-6 rounded-surface border border-edge bg-surface p-5 sm:p-6">
                <p className="text-base text-ink">O primeiro mês é por nossa conta.</p>
                <p className="mt-2 max-w-[58ch] text-sm text-muted">
                  Acesso completo ao app por 30 dias, sem cartão e sem cobrança
                  automática. A leitura da sua prova segue gratuita e sem cadastro.
                </p>
                <p className="mt-4 max-w-[58ch] text-sm text-muted">
                  As assinaturas ainda não abriram. Quando abrirem, quem se cadastrar
                  agora paga{" "}
                  <span className="text-ink">R$ 490 no primeiro ano</span>, em vez de
                  R$ 590. Avisamos antes, e ninguém é cobrado sem contratar.
                </p>
              </div>
            </div>
          </section>
        </FunilHome>

        {/* Rodapé: identificação, e mais nada. Cláusula vive no `TermsModal`;
            fechar a página com ressalva legal gasta a última linha desfazendo o
            que as outras construíram. */}
        <footer className={`${CONT} border-t border-rule py-8 text-sm text-muted`}>
          <p>
            {SITE_NAME} · {SITE_QUALIFICADOR} · {total} bancas analisadas
          </p>
        </footer>
      </main>
    </>
  );
}
