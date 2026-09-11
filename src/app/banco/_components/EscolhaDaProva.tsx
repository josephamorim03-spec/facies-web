"use client";

/**
 * QUAL PROVA — a pergunta que só aparece quando ela existe.
 *
 * A maioria das bancas aplica uma prova por ano, e aí não há o que perguntar:
 * este bloco não renderiza nada. Mas algumas aplicam duas — a PE tem `n=1` e
 * `n=2`, com 100 e 99 questões, e cada uma já é uma prova inteira.
 *
 * Sem esta escolha o modo prova **desistia**: com duas edições no recorte,
 * nenhuma regra decide qual o aluno quer, e servir a união entregaria 199
 * questões com o nome de "a prova". A saída era cair no recorte de treino, que
 * mistura as duas. Medido: 20 de 72 combinações banca/ano nas 12 maiores bancas.
 *
 * ⚠️ Não confundir com o outro caso: quando a fonte parte o MESMO caderno em
 * duas entradas por variação do texto da modalidade, elas compartilham o
 * `exam_number` e são unidas antes de chegar aqui. Este seletor só vê aplicações
 * de verdade.
 */

import type { QuestionBankExamEdition } from "@/lib/api";

import { BotaoDeEscolha } from "@/components/ui/BotaoDeEscolha";
import { chaveDaProva } from "../_lib/tamanhoDaProva";
import { resumoDaProva } from "../_lib/resumoDaProva";

/** Uma prova do recorte: a chave que a identifica e quanto dela o acervo tem. */
type Aplicacao = {
  entrada: string;
  rotulo: string;
  capturadas: number;
  declaradas: number | null;
};

/**
 * O rótulo do botão. "Prova 2" no acesso direto; no R+, a especialidade — e sem
 * o prefixo de 45 caracteres que todos os cadernos repetem.
 */
function rotulo(edicao: QuestionBankExamEdition, entrada: string): string {
  if (edicao.access_group !== "RPLUS") return `Prova ${entrada}`;
  const curto = entrada.split(" - ").pop() ?? entrada;
  return curto.trim() || entrada;
}

function aplicacoes(edicoes: QuestionBankExamEdition[]): Aplicacao[] {
  const porChave = new Map<string, Aplicacao>();
  for (const edicao of edicoes) {
    const chave = chaveDaProva(edicao);
    const atual = porChave.get(chave);
    if (atual) {
      // Metades do mesmo caderno somam: é o que o backend também faz.
      atual.capturadas += edicao.captured_count;
      atual.declaradas = atual.declaradas ?? edicao.declared_count;
    } else {
      porChave.set(chave, {
        entrada: chave,
        rotulo: rotulo(edicao, chave),
        capturadas: edicao.captured_count,
        declaradas: edicao.declared_count,
      });
    }
  }
  return [...porChave.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

export function EscolhaDaProva({
  edicoes,
  carregando,
  valor,
  onChange,
}: {
  edicoes: QuestionBankExamEdition[];
  carregando: boolean;
  valor: string | null;
  onChange: (proximo: string | null) => void;
}) {
  const opcoes = aplicacoes(edicoes);

  // UMA aplicação: não há "qual prova?" a perguntar, mas há o que DIZER. O aluno
  // escolhia a prova sem saber se ela já aconteceu (o rótulo é o ano da turma,
  // não o da aplicação) nem se o acervo a tem inteira.
  if (!carregando && opcoes.length === 1 && edicoes.length > 0) {
    const resumo = resumoDaProva(edicoes[0]);
    return (
      <div className="space-y-1.5">
        <span className="paper-eyebrow">A prova</span>
        <p className="text-sm text-ink">
          {resumo.tamanho}
          {resumo.quando ? <span className="text-muted"> · {resumo.quando}</span> : null}
        </p>
        {resumo.alerta ? (
          <p className="text-xs text-muted">{resumo.alerta}</p>
        ) : null}
      </div>
    );
  }

  // Nenhuma edição, ou ainda carregando: nada a dizer, e inventar seria pior.
  if (carregando || opcoes.length < 2) return null;

  return (
    <fieldset className="space-y-1.5">
      <legend className="paper-eyebrow">Qual prova</legend>
      <p className="text-xs text-muted">
        Esta banca tem {opcoes.length} provas neste ano. Escolha uma — juntá-las
        entregaria {opcoes.reduce((soma, o) => soma + o.capturadas, 0)} questões como se
        fossem um caderno só.
      </p>
      <div className="flex flex-wrap gap-2 pt-1" role="radiogroup" aria-label="Qual prova">
        {opcoes.map((opcao) => {
          const escolhida = valor === opcao.entrada;
          return (
            // ⚠️ Era `bg-surfaceMuted` sobre `border-edge`, sem alvo minimo — o
            // anti-padrao exato que o `BotaoDeEscolha` foi escrito para matar.
            // O escolhido do resto da identidade e' `bg-washSelecao` sobre
            // `border-rule`, e contra um fundo mudo aquele par mede 1,02:1: o
            // escolhido sumia onde a tela ja tinha superficie.
            //
            // `declaradas` NULL e' "ninguem conferiu o edital", e nunca zero:
            // afirmar "de 0" seria inventar o denominador.
            <BotaoDeEscolha
              key={opcao.entrada}
              escolhido={escolhida}
              onClick={() => onChange(escolhida ? null : opcao.entrada)}
              descricao={
                opcao.declaradas
                  ? `${opcao.capturadas} de ${opcao.declaradas} questões`
                  : `${opcao.capturadas} questões`
              }
            >
              {opcao.rotulo}
            </BotaoDeEscolha>
          );
        })}
      </div>
    </fieldset>
  );
}
