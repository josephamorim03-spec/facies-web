import { RotuloSecao } from "./RotuloSecao";

/**
 * Seção 05 da v7 — "sem letra miúda": o que funciona hoje, o que chega, e o que
 * ainda não existe.
 *
 * ## Duas linhas saíram da coluna "funciona hoje", e isso não foi liberdade
 *
 * O guia de texto tem um teste de três perguntas, e a primeira é **"É verdade
 * hoje? Não 'vai ser' — hoje."** Numa seção chamada "sem letra miúda", uma
 * linha falsa não é um exagero de marketing: ela desmente a seção inteira.
 * Conferido contra o código e o dataset:
 *
 * - **"Comparar duas provas lado a lado"** — não existe. Não há tela, rota nem
 *   componente de comparação em lugar nenhum do produto. Desceu para a terceira
 *   coluna, que é o lugar que a própria v7 criou para isto.
 * - **"As nove medidas"** — as nove SÃO medidas (`question_analysis.v5` no
 *   backend traz `answer_format`, `has_image`, `negation`, `distractor_similar`
 *   e as demais), mas o dataset público expõe a distribuição de formato e as
 *   alternativas, não as nove. A linha ficou, dizendo o que a página mostra:
 *   as medidas, com destaque para as que distinguem a prova — que é
 *   exatamente o portão de `ComoCobra` (Wilson + Cohen h).
 *
 * As outras quatro linhas estão verbatim da v7, e foram conferidas uma a uma:
 * a leitura por banca existe em `/facies/[banca]`, `mais_cai` tem exatamente 15
 * linhas em todas as 141 bancas, e o piso de exibição é `PISO_N_CELULA`.
 *
 * ⚠️ A coluna do meio é COMPROMISSO PÚBLICO COM DATA. Ela não é minha para
 * escrever sozinho — o texto é o da v7, e quem assume o prazo é quem publica.
 */

const HOJE = [
  "A leitura completa das provas que já analisamos",
  "Os 15 assuntos mais cobrados, com quanto cada um cresceu ou caiu",
  "As medidas de como a prova escreve as questões, com destaque para as que a distinguem das outras",
  "Aviso claro quando temos poucas questões de uma prova — em vez de fingir precisão",
  "Análise feita por sistema automático, com o critério aberto para você conferir",
];

const CHEGA = [
  "A leitura do ENAMED 2026, dois dias depois da prova",
  "O resultado da nossa aposta, com a conta ao lado",
  "Teste de 20 questões para descobrir o que você ainda não domina",
  "Seu mapa da prova, separando o que já é medida do que ainda é estimativa",
];

const AINDA_NAO = [
  "Plano diário que se refaz em volta dos seus plantões",
  "Revisão que volta na hora certa, assunto por assunto",
  "Explicação por trás de cada questão",
  "Controle de ritmo: quanto tempo você gastaria na prova real",
  "Comparar duas provas lado a lado",
  "Revisão médica das classificações, com o grau de concordância publicado",
];

function Coluna({
  titulo,
  itens,
  tom,
}: {
  titulo: string;
  itens: string[];
  tom: "hoje" | "chega" | "nao";
}) {
  // O filete da esquerda carrega o estado, e o rótulo o nomeia. Cor sozinha
  // nunca decide: quem não distingue as três cores lê os três títulos.
  const filete =
    tom === "hoje" ? "border-primary" : tom === "chega" ? "border-warning" : "border-rule";
  return (
    <div>
      <h3 className="paper-eyebrow">{titulo}</h3>
      <ul className="mt-4 space-y-3">
        {itens.map((item) => (
          <li
            key={item}
            className={`border-l-2 ${filete} pl-3 text-base ${
              tom === "nao" ? "text-muted" : "text-ink"
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SecaoSemLetraMiuda() {
  return (
    <section className="sec">
      <div className="mx-auto w-full max-w-5xl px-[var(--gutter)]">
        <RotuloSecao numero="05">sem letra miúda</RotuloSecao>
        <h2 className="mt-3 max-w-[24ch] font-serif font-semibold text-ink">
          O que você recebe hoje — e o que ainda não está pronto.
        </h2>
        {/* A MOLDURA MUDOU, e a razão é a mesma que tirou as duas linhas da
            primeira coluna. A v7 escreve "assinar agora dá acesso imediato ao
            que já funciona" — e a assinatura não está aberta. Além de falso
            hoje, é declaração de oferta, que o art. 30 do CDC vincula.

            O que a frase fazia continua sendo feito: dizer que a lista abaixo é
            o limite, e que preferimos escrever aqui a você descobrir depois. */}
        <p className="max-w-[62ch] text-base text-muted">
          A leitura da sua prova é gratuita e é o que está pronto. Abaixo está o limite
          exato do que ela faz hoje — preferimos escrever aqui do que você descobrir depois.
        </p>

        <div className="mt-10 grid gap-8 md:grid-cols-3">
          <Coluna titulo="funciona hoje" itens={HOJE} tom="hoje" />
          <Coluna titulo="chega em 16 de setembro" itens={CHEGA} tom="chega" />
          <Coluna titulo="ainda não existe" itens={AINDA_NAO} tom="nao" />
        </div>

        {/* ⚠️ A LINHA DE FECHO DA v7 SAIU INTEIRA: "quem assina agora paga o
            preço de hoje e recebe tudo o que chegar depois, sem pagar mais. Se
            mudar de ideia, o reembolso em 7 dias é integral".

            São três promessas — preço travado, escopo futuro e reembolso — sobre
            uma assinatura que não existe. O art. 30 do CDC vincula a oferta
            anunciada, e o repositório já registra ter removido daqui uma
            afirmação de preço pelo mesmo motivo. Ela volta junto com o checkout,
            no mesmo dia em que `SecaoPreco` for montada. */}
        <p className="mt-10 max-w-[62ch] border-t border-rule pt-6 text-base text-muted">
          A coluna do meio é compromisso com data, e a da direita é o que ainda não existe.
          Nenhuma das duas está à venda hoje.
        </p>
      </div>
    </section>
  );
}
