"use client";

import { useMemo, useState } from "react";

import type { CalendarEventOut } from "@/lib/api/domains/calendar";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import {
  excecoesDaSemana,
  horasPorExtenso,
  minutosPorExtenso,
  resumoDaSemana,
  rotuloDaExcecao,
  semanaPadrao,
  type LinhaDaSemana,
  type TipoDeDia,
} from "@/lib/rotina";

/**
 * A semana padrão — artboard `14a`.
 *
 * ## A pergunta que nenhum app faz
 *
 * O resto do produto pergunta "quanto dá hoje" todo dia, o que funciona uma vez
 * e cansa na terceira semana. Aqui a pergunta é respondida UMA vez, por tipo de
 * dia, e o plano do dia nasce dela.
 *
 * ## "Nada" é resposta legítima
 *
 * Ela aparece escrita, nunca como `0 min`, e não tem penalidade. Quem trabalha
 * em escala vai ter dias em que não dá — e um produto que trata isso como falha
 * é abandonado na terceira semana.
 *
 * ## A cor nunca decide sozinha
 *
 * O filete de 3px diz o tipo do dia (âmbar plantão, âmbar lavado pós-plantão,
 * petróleo livre, tinta trabalho comum) e o rótulo escrito diz o mesmo ao lado,
 * em todas as linhas.
 */

/** O filete de 3px à esquerda. A palavra ao lado repete a informação. */
const FILETE: Record<TipoDeDia, string> = {
  plantao: "bg-accent",
  pos_plantao: "bg-washAtencao",
  livre: "bg-primary",
  trabalho: "bg-ink",
};

/** Os atalhos do `14b`, com "Nada" primeiro e sem penalidade. */
const ATALHOS_DE_MINUTOS = [0, 10, 20, 35, 45, 60] as const;

function Linha({
  linha,
  aberta,
  onAbrir,
  onEscolher,
}: {
  linha: LinhaDaSemana;
  aberta: boolean;
  onAbrir: () => void;
  onEscolher: (minutos: number) => void;
}) {
  return (
    <li className="border-b border-rule last:border-b-0">
      <button
        type="button"
        onClick={onAbrir}
        aria-expanded={aberta}
        className="flex min-h-12 w-full items-center gap-3 px-3 text-left"
      >
        <span className={`h-8 w-[3px] shrink-0 ${FILETE[linha.tipo]}`} aria-hidden="true" />
        <span className="w-8 shrink-0 font-mono text-nota text-muted">{linha.curto}</span>
        <span className="flex-1 text-sm text-ink">{linha.rotulo}</span>
        <span
          className={`font-mono text-nota ${
            (linha.minutos ?? 0) > 0 ? "text-ink" : "text-muted"
          }`}
        >
          {minutosPorExtenso(linha.minutos)}
        </span>
      </button>

      {aberta ? (
        <div className="px-3 pb-3">
          <p className="paper-eyebrow mb-2">dá para estudar neste dia?</p>
          <div className="flex flex-wrap gap-2">
            {ATALHOS_DE_MINUTOS.map((valor) => {
              const escolhido = linha.minutos === valor;
              return (
                <button
                  key={valor}
                  type="button"
                  aria-pressed={escolhido}
                  onClick={() => onEscolher(valor)}
                  className={`min-h-11 rounded-control border px-3 text-sm ${
                    escolhido
                      ? "border-primary bg-primary text-primaryInk"
                      : "border-edge bg-surface text-ink"
                  }`}
                >
                  {valor === 0 ? "Nada" : minutosPorExtenso(valor)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </li>
  );
}

export function MinhaSemana({
  eventos,
  disponibilidade,
  hojeISO,
  minutosPorQuestao,
  ritmoEhDoAluno,
  diasAteAProva,
  salvando,
  onSalvar,
  onAdicionar,
  onRemoverExcecao,
}: {
  eventos: CalendarEventOut[];
  disponibilidade: Record<string, number> | null | undefined;
  hojeISO: string;
  minutosPorQuestao: number;
  /** Decide a frase: "no seu ritmo" ou "supondo N min por questão". */
  ritmoEhDoAluno: boolean;
  diasAteAProva: number | null;
  salvando: boolean;
  onSalvar: (disponibilidade: Record<string, number>) => void;
  onAdicionar: () => void;
  onRemoverExcecao: (evento: CalendarEventOut) => void;
}) {
  const [rascunho, setRascunho] = useState<Record<string, number> | null>(null);
  const [aberta, setAberta] = useState<number | null>(null);

  // ⚠️ `null` E' "NAO CONSEGUI LER", e `{}` e' "voce ainda nao declarou".
  //
  // Colapsar os dois fazia a tela dizer "diga quanto da' para estudar" depois de
  // uma falha de rede -- e o aluno que ja' tinha respondido veria a semana dele
  // em branco, como se o produto tivesse perdido o que ele declarou. E' a mesma
  // distincao que o resto desta tela faz entre "nada" e "—".
  const naoLeu = disponibilidade === null && rascunho === null;

  // O `?? {}` criava um objeto NOVO a cada render, entao os `useMemo` abaixo
  // recalculavam sempre e o memo nao memorizava nada.
  const atual = useMemo(
    () => rascunho ?? disponibilidade ?? {},
    [rascunho, disponibilidade],
  );
  const linhas = useMemo(
    () => semanaPadrao(eventos, atual, hojeISO),
    [eventos, atual, hojeISO],
  );
  const resumo = useMemo(
    () => resumoDaSemana(linhas, minutosPorQuestao),
    [linhas, minutosPorQuestao],
  );
  const excecoes = useMemo(() => excecoesDaSemana(eventos, hojeISO), [eventos, hojeISO]);

  const sujo = rascunho !== null;

  function escolher(indice: number, minutos: number) {
    setRascunho({ ...atual, [String(indice)]: minutos });
  }

  if (naoLeu) {
    return (
      <Alert variant="warning">
        Não consegui ler a sua semana agora. Ela continua salva — recarregue a página
        para editá-la.
      </Alert>
    );
  }

  return (
    <section>
      <p className="max-w-[62ch] text-sm leading-6 text-muted">
        O plano do dia é montado a partir dela. Dá para mudar quando a escala mudar.
      </p>

      <p className="paper-eyebrow mt-6">semana padrão</p>
      <ul className="mt-2 rounded-surface border border-edge bg-surface">
        {linhas.map((linha) => (
          <Linha
            key={linha.indice}
            linha={linha}
            aberta={aberta === linha.indice}
            onAbrir={() => setAberta(aberta === linha.indice ? null : linha.indice)}
            onEscolher={(minutos) => escolher(linha.indice, minutos)}
          />
        ))}
      </ul>

      <p className="paper-eyebrow mt-6">esta semana</p>
      {excecoes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Nenhuma exceção. A semana segue o padrão acima.
        </p>
      ) : (
        <ul className="mt-2 rounded-surface border border-edge bg-surface">
          {excecoes.map((evento) => (
            <li
              key={evento.event_id}
              className="flex min-h-12 items-center gap-3 border-b border-rule px-3 last:border-b-0"
            >
              <span className="font-mono text-nota text-muted">
                {(evento.event_date ?? "").slice(8, 10)}/
                {(evento.event_date ?? "").slice(5, 7)}
              </span>
              <span className="flex-1 text-sm text-ink">{rotuloDaExcecao(evento)}</span>
              <button
                type="button"
                onClick={() => onRemoverExcecao(evento)}
                aria-label={`Remover ${rotuloDaExcecao(evento)}`}
                className="min-h-11 px-2 text-sm text-muted hover:text-ink"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* O resumo é o que transforma sete linhas numa decisão: quanto cabe, e
          com que procedência. Sem número, a tela é um formulário; com número,
          é uma resposta. */}
      <p className="mt-6 max-w-[62ch] text-sm leading-6 text-ink">
        {resumo.vazia ? (
          "Diga quanto dá para estudar em cada dia — é disso que o plano tira o tamanho do seu dia."
        ) : (
          <>
            Com esta rotina cabem{" "}
            <strong className="font-semibold">{horasPorExtenso(resumo.minutosTotais)}</strong> por
            semana — cerca de {resumo.questoes} questões
            {ritmoEhDoAluno
              ? ", no seu ritmo"
              : `, supondo ${minutosPorQuestao} min por questão`}
            .{diasAteAProva !== null ? ` Faltam ${diasAteAProva} dias até a sua prova.` : ""}
          </>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onAdicionar}>
          Adicionar plantão ou exceção
        </Button>
        {sujo ? (
          <Button
            onClick={() => {
              onSalvar(atual);
              setRascunho(null);
              setAberta(null);
            }}
            disabled={salvando}
          >
            {salvando ? "Salvando" : "Salvar a rotina"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
