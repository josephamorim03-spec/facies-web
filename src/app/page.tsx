import type { Metadata } from "next";
import { RedirectIfAuthenticated } from "./_components/RedirectIfAuthenticated";
import { FunilHome } from "./_components/FunilHome";
import { BuscaDeProva } from "@/components/facies/BuscaDeProva";
import { FaixaAreas } from "@/components/facies/FaixaAreas";
import { SecaoAposta } from "@/components/facies/SecaoAposta";
import { SecaoNoveMedidas } from "@/components/facies/SecaoNoveMedidas";
import { SecaoOndeEncaixa } from "@/components/facies/SecaoOndeEncaixa";
import { SecaoSemLetraMiuda } from "@/components/facies/SecaoSemLetraMiuda";
import { bancasEmDestaque, todasAsBancas } from "@/lib/facies";
import { todasAsProvas } from "@/lib/provas";
import { SITE_NAME, SITE_QUALIFICADOR } from "@/lib/site";
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
 * **A seção 06 (preço) existe em `SecaoPreco` e NÃO está montada.** Sem
 * checkout, preço na tela é oferta que o art. 30 do CDC obriga a sustentar.
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

/** O contêiner único da v7: 1080px com a goteira em token. */
// 1080px é o `.cont` do desenho, MEDIDO nele renderizado. `max-w-5xl` são
// 1024 — 56px a menos, que em 1440 encolhe a coluna inteira e faz a manchete
// quebrar antes do ponto onde o desenho a quebra.
const CONT = "mx-auto w-full max-w-[1080px] px-[var(--gutter)]";

export default function Home() {
  const destaques = bancasEmDestaque();
  const provaEmDestaque = todasAsProvas()[0];
  const total = todasAsBancas().length;

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
            cabeçalho não é uma, é o topo do documento. */}
        <div className={`${CONT} pt-3`}>
          <CabecalhoPublico />
        </div>

        {/* `pt-8` e não `--bloco`: o herói já vem depois da régua do cabeçalho,
            e o respiro cheio de seção duplicaria a separação que a régua faz. */}
        <section className="pb-8 pt-4">
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
                      legenda em qualquer segmento. */}
                  {provaEmDestaque.sigla} · {provaEmDestaque.base.direta.questoes} questões ·
                  o peso de cada área
                </h2>
                <FaixaAreas
                  className="mt-2"
                  altura="previa"
                  legenda
                  rotulo={`Peso de cada área na ${provaEmDestaque.sigla}`}
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
            <h1 className="mt-4 max-w-[16ch] font-serif font-semibold text-ink">
              Você sabe o que a sua prova cobra?
            </h1>

            <p className="lede mt-3 text-muted">
              Isto aí em cima é a cara do {provaEmDestaque?.sigla ?? "ENAMED"}, medida questão
              por questão. Cada prova tem a{" "}
              <span className="text-marcaViva">sua</span> — e ela muda o que vale estudar.
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
            <p className="mt-5 flex items-center gap-2.5 text-sm text-muted">
              <span aria-hidden="true">↓</span>
              {provaEmDestaque
                ? `a cara completa do ${provaEmDestaque.sigla}, logo abaixo`
                : "a leitura completa, logo abaixo"}
            </p>
          </div>
        </section>

        <FunilHome bancas={destaques} prova={provaEmDestaque}>
          {/* As seções estáticas entram por dentro do funil e continuam sendo
              server components: um componente cliente envolvendo a página toda
              arrastaria para o bundle conteúdo que nunca muda. */}
          {provaEmDestaque ? <SecaoAposta prova={provaEmDestaque} /> : null}
          <SecaoNoveMedidas prova={provaEmDestaque} />
          <SecaoOndeEncaixa />
          <SecaoSemLetraMiuda />

          {/* ── O aviso ─────────────────────────────────────────────────
              Fora da v7, e de propósito. A v7 fecha em preço; aqui não há
              checkout, então o que fecha é o que É verdade hoje.

              "Em breve" não entra: promessa de prazo cria a mesma obrigação
              que o número criava. Este bloco é a pergunta ("o app ainda não
              está aberto") e o gate logo abaixo é a resposta ("saber quando
              abrir") — a adjacência é a razão da ordem. */}
          <section className="sec" id="aviso">
            <div className={CONT}>
              <h2 className="font-serif font-semibold text-ink">Acesso</h2>
              <p className="max-w-[58ch] text-base text-muted">
                A Fácies é para quem estuda em janela irregular — plantão, pós-plantão, noite
                curta — e está em <span className="text-ink">consolidação e revisão</span>,
                não em primeiro aprendizado. Questão não ensina do zero: para primeiro
                contato, videoaula é melhor. A teoria vem de fora por desenho; você já tem o
                conteúdo, e a Fácies diz o que fazer com ele.
              </p>
              <div className="mt-6 rounded-surface border border-edge bg-surface p-5 sm:p-6">
                <p className="text-base text-ink">
                  O app ainda não está aberto para assinatura.
                </p>
                <p className="mt-2 max-w-[58ch] text-sm text-muted">
                  A leitura da sua prova é gratuita e não depende disso — ela é o que está
                  pronto, e continua sendo. Quando a assinatura abrir, as condições aparecem
                  aqui.
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
