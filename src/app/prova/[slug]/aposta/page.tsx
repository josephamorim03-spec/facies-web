import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";
import { Compartilhar } from "@/components/facies/Compartilhar";
import { dec } from "@/lib/decimal";
import {
  dataDoRegistro,
  listaDaManchete,
  previsaoPorExamKey,
  todasAsPrevisoes,
} from "@/lib/previsao";
import { provaPorSlug, todasAsProvas } from "@/lib/provas";
import { CONT_LANDING } from "@/lib/site";

/**
 * A aposta registrada, aberta.
 *
 * ## Por que esta página existe separada da seção da home
 *
 * `SecaoAposta` promete: "registro com data e código de verificação". Uma
 * promessa de verificabilidade sem lugar onde verificar é pior que não fazê-la —
 * é a forma mais cara de perder o único ativo que este produto não recompra. Ela
 * é o destino daquele parágrafo.
 *
 * ## O que a página publica, e por que cada número está aqui
 *
 * O par PONTO + FAIXA, e nunca só o ponto. O ponto (35 de 100, contra um piso de
 * 10,3%) é uma medição, com `edicoes_diretas: 1` ao lado. A faixa são as 13
 * medições anteriores do mesmo método, com split temporal — e ela inclui o
 * mínimo de 0,67×, que ficou ABAIXO do acaso.
 *
 * Publicar o pior caso não é escrúpulo, é o argumento: quem duvida de um número
 * medido uma vez tem razão; quem duvida de uma faixa medida em treze precisa
 * argumentar contra o método. O docstring de `_historico()` em
 * `kbank/scripts/build_prova_dataset.py` decidiu isso antes desta página existir.
 *
 * ## O SCORE NÃO É EXIBIDO, e a omissão é deliberada
 *
 * Cada item tem `score` — soma ponderada de `diretas + 0,4 × correlatas`. Numa
 * lista de assuntos de prova, um número ao lado do rótulo lê como "quantas
 * questões caíram disto", que é o que ele NÃO é. `page.tsx` da prova já registra
 * a mesma recusa ("exibiria o score ponderado como se fosse contagem de
 * questões — a precisão fabricada que esta página recusa"). Aqui a ordem já
 * carrega a informação: a lista é o ranking.
 *
 * Estática, como as irmãs: o tráfego é pico de WhatsApp.
 */

type Props = { params: Promise<{ slug: string }> };

/** Só as provas que TÊM aposta registrada viram página. Uma rota `/aposta` viva
 *  para as 138 bancas seria um 404 disfarçado de promessa. */
export function generateStaticParams() {
  const comPrevisao = new Set(todasAsPrevisoes().map((previsao) => previsao.exam_key));
  return todasAsProvas()
    .filter((prova) => comPrevisao.has(prova.exam_key))
    .map((prova) => ({ slug: prova.slug }));
}

function curta(iso: string): string {
  const [, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}.${mes}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const prova = provaPorSlug(slug);
  const previsao = prova ? previsaoPorExamKey(prova.exam_key) : undefined;
  if (!prova || !previsao) return {};

  const caminho = `/prova/${slug}/aposta`;
  const titulo = `A aposta da Fácies para o ${prova.sigla}`;
  const descricao = `Os ${previsao.base_composition.top_n} assuntos que medimos como mais prováveis no ${prova.sigla}, registrados com data e hash em ${dataDoRegistro(previsao.registered_at)} — antes da prova. Depois publicamos quanto erramos.`;

  return {
    title: titulo,
    description: descricao,
    alternates: { canonical: caminho },
    openGraph: { title: titulo, description: descricao, url: caminho },
  };
}

export default async function PaginaDaAposta({ params }: Props) {
  const { slug } = await params;
  const prova = provaPorSlug(slug);
  const previsao = prova ? previsaoPorExamKey(prova.exam_key) : undefined;
  const lista = previsao ? listaDaManchete(previsao) : undefined;
  if (!prova || !previsao || !lista) notFound();

  const v = prova.validacao;
  const medido = v.status === "medido" ? v : null;
  const historico = medido && medido.historico.status === "medido" ? medido.historico : null;

  /**
   * As frases montadas por interpolação vivem AQUI, e o campo do dataset é lido
   * numa linha ANTES de entrar no template.
   *
   * `check-portuguese-ui-copy.mjs` varre literais e texto de JSX procurando
   * palavra sem acento. `fonte.questoes` e `historico.minimo` são nomes de campo
   * (chaves vindas do Python, sem acento por construção) e disparavam o guard
   * como se fossem copy — inclusive depois de saírem do JSX, porque o checker lê
   * o literal onde quer que ele esteja.
   *
   * Ler o campo para uma variável de nome neutro tira a palavra de dentro da
   * string e mantém o guard intacto. Abrir exceção nominal no checker seria a
   * troca errada: exceção envelhece e deixa de proteger o caso real.
   */
  const fontesDaBase = previsao.base_composition.correlatas
    .map((fonte) => {
      const total = fonte.questoes.toLocaleString("pt-BR");
      return `${total} do ${fonte.nome}`;
    })
    .join(" e ");
  const pesoDaCorrelata = dec(previsao.base_composition.correlatas[0]?.peso ?? 0, 1);

  /**
   * O GANHO VAI EM DUAS CASAS, e a casa extra não é preciosismo.
   *
   * `dec()` usa uma casa por padrão, e com ela o mínimo histórico de 0,67 sai
   * "0,7×" na tela. O número continua abaixo de 1 — a afirmação não fica falsa —
   * mas o arredondamento é PARA CIMA, e este é justamente o número cuja única
   * função é mostrar que publicamos o caso ruim. Suavizar o pior caso a nosso
   * favor, na página que existe para não fazer isso, é o defeito que a página
   * inteira argumenta contra.
   *
   * Duas casas para a família inteira do ganho (ponto, mediana, mínimo, máximo)
   * e não só para o mínimo: numa mesma frase, casas diferentes fazem um dos
   * números parecer medido com menos cuidado que o outro.
   */
  const ganho = (valor: number) => dec(valor, 2);
  const piorCaso = historico ? ganho(historico.minimo) : null;
  const melhorCaso = historico ? ganho(historico.maximo) : null;
  const faixaMedida =
    piorCaso && melhorCaso ? `${piorCaso}× a ${melhorCaso}×` : "abaixo a acima do acaso";

  return (
    <main className={`${CONT_LANDING} pb-16`}>
      <CabecalhoPublico comLink />

      <header className="pb-8">
        <span className="paper-eyebrow">
          a aposta · registrada em {dataDoRegistro(previsao.registered_at)}
        </span>
        <h1 className="mt-3 max-w-[22ch] font-serif text-4xl/[1.45] font-semibold tracking-tight text-ink sm:text-5xl/[1.45]">
          O que achamos que cai no {prova.sigla}.
        </h1>
        <p className="mt-4 max-w-[60ch] text-lg text-muted">
          Esta lista foi fechada <span className="text-ink">antes</span> da prova, com data e
          código de verificação. Depois do gabarito nós publicamos a conta — inclusive o que
          ficou de fora.
        </p>
      </header>

      {/* ── A evidência: o ponto e a faixa, nesta ordem ───────────────────── */}
      {medido ? (
        <section className="paper-surface p-5 sm:p-6" aria-labelledby="evidencia">
          <h2 id="evidencia" className="paper-eyebrow">
            o método já foi medido assim
          </h2>

          <p className="mt-4 font-mono text-3xl text-ink">
            {medido.acertos} de {medido.de}
          </p>
          <p className="mt-1 max-w-[60ch] text-base text-muted">
            assuntos da última edição já lida caíram dentro de uma lista de{" "}
            {previsao.base_composition.top_n} montada só com as provas correlatas — contra{" "}
            {dec(medido.piso_pct)}% que uma lista tirada ao acaso cobriria. É{" "}
            <span className="text-ink">{ganho(medido.lift ?? 0)}× o acaso</span>, em{" "}
            {medido.edicoes_diretas === 1
              ? "uma única edição direta"
              : `${medido.edicoes_diretas} edições diretas`}
            .
          </p>

          {/* A FAIXA, e ela é o que dá lastro ao ponto acima. Sem ela, um número
              medido uma vez está sendo apresentado como desempenho esperado. */}
          {historico ? (
            <div className="mt-5 border-t border-rule pt-5">
              <p className="max-w-[60ch] text-base text-muted">
                O mesmo método, rodado em {historico.medicoes} edições anteriores com treino
                só no passado de cada uma: ganho mediano de{" "}
                <span className="text-ink">{ganho(historico.mediana)}×</span>, entre{" "}
                {piorCaso}× e {melhorCaso}×.
              </p>
              <p className="mt-3 max-w-[60ch] text-sm text-muted">
                O mínimo é {piorCaso}× —{" "}
                <span className="text-ink">abaixo do acaso</span>. Ele está aqui porque
                aconteceu: quando a base era pequena, o método acertou menos que sortear. Uma
                faixa medida {historico.medicoes} vezes diz mais sobre o que esperar do que um
                número medido uma.
              </p>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* ── O registro ────────────────────────────────────────────────────── */}
      <section className="mt-8" aria-labelledby="registro">
        <h2 id="registro" className="paper-eyebrow">
          o registro
        </h2>
        <p className="mt-3 max-w-[62ch] text-base text-muted">
          O código abaixo é o sha256 do conteúdo desta previsão: a lista, o grão em que ela é
          julgada e a base de onde saiu. Qualquer edição posterior — um rótulo, uma posição —
          muda o código. É o que impede a conta de ser puxada a nosso favor depois da prova.
        </p>

        <dl className="mt-5 grid gap-px overflow-hidden border border-edge bg-edge sm:grid-cols-2">
          {[
            { termo: "registrado em", valor: dataDoRegistro(previsao.registered_at) },
            { termo: "método", valor: previsao.method_version },
            {
              termo: "grão julgado",
              valor: `${previsao.headline_grain} · métrica ${previsao.headline_metric}`,
            },
            {
              termo: "universo",
              valor: `${lista.universo} assuntos · piso de ${dec(lista.piso_pct)}% ao acaso`,
            },
          ].map(({ termo, valor }) => (
            <div key={termo} className="bg-surface px-4 py-3">
              <dt className="paper-eyebrow">{termo}</dt>
              <dd className="mt-1 font-mono text-sm text-ink">{valor}</dd>
            </div>
          ))}
        </dl>

        {/* `break-all` porque 64 caracteres não cabem em tela de celular e o
            hash truncado não serve para conferir nada. */}
        <div className="mt-px bg-surface px-4 py-3 ring-1 ring-edge">
          <p className="paper-eyebrow">sha256 do conteúdo</p>
          <p className="mt-1 break-all font-mono text-sm text-ink">{previsao.content_sha256}</p>
        </div>

        <p className="mt-4 max-w-[62ch] text-sm text-muted">
          A base: {previsao.base_composition.direta.questoes} questões da própria prova, mais{" "}
          {fontesDaBase} com peso {pesoDaCorrelata} — elas seguem a mesma matriz, mas não são a
          mesma prova, e entrar com peso cheio seria dizer que são.
        </p>
      </section>

      {/* ── A lista ───────────────────────────────────────────────────────── */}
      <section className="mt-10" aria-labelledby="lista">
        <h2 id="lista" className="paper-eyebrow">
          os {previsao.base_composition.top_n} assuntos, na ordem
        </h2>
        <ol className="mt-4 grid gap-px overflow-hidden border border-edge bg-edge sm:grid-cols-2">
          {lista.lista.map((item) => (
            <li key={item.posicao} className="flex gap-3 bg-surface px-4 py-3">
              <span className="w-6 shrink-0 font-mono text-sm text-muted">
                {String(item.posicao).padStart(2, "0")}
              </span>
              <span className="min-w-0 text-base text-ink">{item.rotulo}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── O que vem depois ──────────────────────────────────────────────── */}
      <section className="mt-10" aria-labelledby="depois">
        <h2 id="depois" className="paper-eyebrow">
          o que vem depois
        </h2>
        <ol className="mt-4 space-y-4">
          {[
            { quando: curta(prova.aplicacao_prevista), o_que: "Você faz a prova." },
            {
              quando: curta(prova.cadernos_previstos),
              o_que: "O Inep divulga os cadernos e o gabarito.",
            },
            {
              quando: "depois",
              o_que:
                "Publicamos a conta: quantos destes caíram, quantos não caíram, e quanto uma lista feita só por “o que mais caiu” teria acertado. A classificação das questões é feita sem acesso a esta lista.",
            },
          ].map((etapa) => (
            <li key={etapa.quando} className="flex flex-col gap-1 sm:flex-row sm:gap-5">
              <span className="shrink-0 font-mono text-base text-muted sm:w-16">
                {etapa.quando}
              </span>
              <span className="max-w-[58ch] text-base text-ink">{etapa.o_que}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Os limites, ditos por nós ─────────────────────────────────────── */}
      <section className="mt-10" aria-labelledby="limites">
        <h2 id="limites" className="paper-eyebrow">
          o que esta lista não é
        </h2>
        <ul className="mt-4 max-w-[64ch] space-y-3 text-base text-muted">
          <li>
            <span className="text-ink">Não é um resumo para estudar.</span> São assuntos, não
            conteúdo. A Fácies não vende teoria.
          </li>
          <li>
            <span className="text-ink">Não é garantia de nada.</span> A faixa medida vai de{" "}
            {faixaMedida}, e o pior caso já aconteceu.
          </li>
          <li>
            <span className="text-ink">Não cobre a prova inteira.</span> São{" "}
            {previsao.base_composition.top_n} assuntos de {lista.universo}. O resto continua
            podendo cair.
          </li>
        </ul>
      </section>

      <div className="mt-10">
        <Compartilhar
          imagem={`/prova/${prova.slug}/opengraph-image`}
          url={`/prova/${prova.slug}/aposta`}
          nome={`aposta da Fácies para o ${prova.sigla}`}
        />
      </div>

      <footer className="mt-12 border-t border-rule pt-8 text-sm text-muted">
        <p className="max-w-[70ch]">
          A Fácies não promete aprovação e não vende conteúdo teórico. Ela mostra como a sua
          prova cobra e organiza o seu tempo em volta disso.
        </p>
      </footer>
    </main>
  );
}
