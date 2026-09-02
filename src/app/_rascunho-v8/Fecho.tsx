import Link from "next/link";
import { Compartilhar } from "@/components/facies/Compartilhar";
import { GateEmail } from "@/components/facies/GateEmail";
import type { DadosDaLanding } from "./dados";

/**
 * O fecho: a revisão da última semana, o e-mail e o compartilhamento.
 *
 * ## Reuso, e duas correções que ele trouxe
 *
 * A peça estática tinha um formulário de e-mail escrito à mão e um link `wa.me`.
 * Os dois estavam errados, e os componentes de produção já sabiam:
 *
 * - **`GateEmail`** posta de verdade (`registrarInteresse`) e trata os estados.
 *   O docstring dele carrega a mesma regra que a peça seguiu por outro caminho:
 *   *"o gate DEPOIS do valor, e nunca antes"*. Formulário decorativo é pior que
 *   nenhum — a pessoa acha que se inscreveu e a primeira interação com a marca
 *   vira promessa quebrada.
 * - **`Compartilhar`** usa a bandeja NATIVA, e o comentário dele explica por quê:
 *   é o único caminho pelo qual o WhatsApp aparece no celular. O `wa.me` da peça
 *   é o mecanismo inferior, e num produto que se distribui por grupo isso não é
 *   detalhe.
 *
 * ## O contador não envelhece
 *
 * `diasParaProva` vem de `diasAte()`, derivado no servidor. A frase muda de forma
 * com o número — trocar só o número deixava "A prova é hoje, 0 dias para a prova
 * de 13.09", que foi o defeito da primeira versão.
 */
function contagem(dias: number, dataBr: string, iso: string) {
  const data = (
    <time dateTime={iso} className="font-mono tabular-nums">
      {dataBr}
    </time>
  );
  if (dias > 1) {
    return (
      <>
        Faltam <span className="font-mono tabular-nums">{dias}</span> dias para a prova de {data}
      </>
    );
  }
  if (dias === 1) {
    return (
      <>
        Falta <span className="font-mono tabular-nums">1</span> dia para a prova de {data}
      </>
    );
  }
  if (dias === 0) return <>A prova é hoje, {data}</>;
  return <>A prova foi em {data}</>;
}

export function Fecho({ dados }: { dados: DadosDaLanding }) {
  const { prova, diasParaProva, revisao } = dados;
  const dataBr = prova.aplicacao_prevista.split("-").reverse().slice(0, 2).join(".");

  return (
    <section className="bg-primary py-14 text-primaryInk sm:py-24">
      <div className="mx-auto w-full max-w-[1080px] px-5 sm:px-8">
        <div className="max-w-[66ch]">
          <h2 className="mb-4 max-w-[22ch] font-sans text-2xl font-semibold tracking-[-0.018em] text-primaryInk sm:text-4xl">
            A revisão da última semana
          </h2>
          <p className="text-base">
            Nos últimos dias ninguém aprende matéria nova — decide o que revisar.{" "}
            {contagem(diasParaProva, dataBr, prova.aplicacao_prevista)}.
            {revisao ? (
              <>
                {" "}
                Os <span className="font-mono tabular-nums">{revisao.questoes}</span> assuntos mais
                prováveis, distribuídos em{" "}
                <span className="font-mono tabular-nums">{revisao.dias}</span> dias, com{" "}
                <span className="font-mono tabular-nums">{revisao.total}</span> atualizações
                clínicas de fonte primária e{" "}
                <span className="font-mono tabular-nums">{revisao.diasLivres}</span> dias livres
                antes da prova.
              </>
            ) : null}
          </p>
        </div>

        {/* As atualizações deixam de ser contagem. Cada uma traz portaria, data e
            link para o relatório — e todas caem em assunto do top previsto, o que
            não é acaso: a revisão seleciona atualização por assunto previsto. */}
        {revisao && revisao.atualizacoes.length > 0 ? (
          <ul className="m-0 mt-6 list-none p-0">
            {revisao.atualizacoes.map((a) => (
              <li
                key={a.titulo}
                className="border-b border-paper/25 py-3.5 first:border-t last:border-b-0"
              >
                <b className="block font-sans text-base font-semibold">{a.titulo}</b>
                <span className="mt-1 block text-sm text-primaryInk/85">
                  {a.resumo} Em vigor desde{" "}
                  <span className="font-mono tabular-nums">{a.vigencia}</span>.
                  {a.subtemas[0] ? <> Cai em {a.subtemas[0]}.</> : null}
                </span>
                {a.fonte ? (
                  <a
                    href={a.fonte.url}
                    className="paper-control mt-1.5 inline-flex min-h-6 items-center font-mono text-micro
                      text-primaryInk/80 underline underline-offset-4 focus-visible:outline
                      focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
                  >
                    {a.fonte.titulo}
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : null}

        {/* ⚠️ `atualizacoes.json` declara `entra_no_score: false`. Sem esta nota o
            leitor conclui que a mudança normativa é o motivo de a prova cobrar —
            que é exatamente o que não afirmamos. O texto vem do dataset. */}
        {revisao ? (
          <p className="mt-4 max-w-[62ch] text-sm text-primaryInk/80">
            {revisao.notaAtualizacoes}
          </p>
        ) : null}

        <p className="mt-7">
          <Link
            href={`/prova/${prova.slug}/revisao-final`}
            className="paper-control inline-flex min-h-12 items-center justify-center rounded-control
              border border-surface bg-surface px-6 py-3 font-sans text-base font-medium text-primary
              transition hover:bg-paper focus-visible:outline focus-visible:outline-2
              focus-visible:outline-offset-2 focus-visible:outline-surface"
          >
            Abrir a revisão da última semana
          </Link>
          <span className="mt-2.5 block text-sm text-primaryInk/80">grátis · sem cadastro</span>
        </p>

        {revisao ? (
          <p className="mt-6 max-w-[62ch] border-l-2 border-paper/40 pl-4 text-base text-primaryInk/85">
            {revisao.notaPrevisao}
          </p>
        ) : null}

        {/* O e-mail é a única forma de manter esta coorte depois da prova: em
            13.09 a página perde o valor para quem já prestou, e a conta da aposta
            sai depois. Vem por último, quando tudo já foi entregue. */}
        <div className="mt-10 border-t border-paper/25 pt-8">
          <div className="max-w-[62ch]">
            <h3 className="mb-1.5 font-sans text-lg font-semibold text-primaryInk">
              Todo mundo promete acertar. Ninguém mostra a conta.
            </h3>
            <p className="mb-4 text-base text-primaryInk/85">
              A nossa sai assim que os cadernos forem publicados: quantos dos{" "}
              <span className="font-mono tabular-nums">{revisao?.questoes ?? 30}</span> caíram, e
              quais não.
            </p>
          </div>
          <GateEmail banca={prova.exam_key} />
        </div>

        <div className="mt-10 border-t border-paper/25 pt-8">
          <div className="max-w-[62ch]">
            <h3 className="mb-1.5 font-sans text-lg font-semibold text-primaryInk">
              Conhece alguém que presta dia{" "}
              <span className="font-mono tabular-nums">{dataBr.split(".")[0]}</span>?
            </h3>
            <p className="mb-4 text-base text-primaryInk/85">
              A leitura é gratuita e não pede cadastro — mandar não custa nada a quem recebe.
            </p>
          </div>
          <Compartilhar
            imagem={`/prova/${prova.slug}/opengraph-image`}
            url="/"
            nome={`a cara do ${prova.sigla}`}
          />
        </div>
      </div>
    </section>
  );
}
