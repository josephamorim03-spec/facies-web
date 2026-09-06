"use client";

import { useEffect, useMemo, useRef, useState } from "react";

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

/** As durações que fazem um dia ser de trabalho. 0 = não trabalha. */
const HORAS_DE_TRABALHO = [0, 6, 12, 24] as const;

/** Espera antes de gravar sozinho, para juntar rajada de toques. */
const ATRASO_MS = 700;

function Linha({
  linha,
  aberta,
  onAbrir,
  onEscolher,
  onMarcarPlantao,
  marcandoPlantao,
}: {
  linha: LinhaDaSemana;
  aberta: boolean;
  onAbrir: () => void;
  onEscolher: (minutos: number) => void;
  onMarcarPlantao: (horas: number) => void;
  marcandoPlantao: boolean;
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

          {/* ⚠️ O PLANTÃO MORA AQUI, na mesma abertura da disponibilidade.

              Ele vivia atrás de um botão que abria uma folha — e o operador
              apontou o óbvio: as duas coisas são sobre o MESMO dia. "Terça é
              plantão de 24h" e "na terça dá para estudar 10 minutos" são a
              mesma frase dita em duas metades, e separá-las obrigava a
              atravessar a tela para completar o pensamento.

              A folha continua a existir, e passou a servir só o que ela faz
              melhor: plantão numa DATA específica e a escala 24×72. O que se
              repete toda semana — o caso comum — resolve-se na linha.

              ⚠️ Sem nome. O artboard 14b é literal: "nada de nome do hospital,
              o plano não muda com o lugar". O rótulo deriva das horas. */}
          <p className="paper-eyebrow mb-2 mt-4">trabalha neste dia?</p>
          <div className="flex flex-wrap gap-2">
            {HORAS_DE_TRABALHO.map((horas) => {
              const escolhido =
                horas === 0
                  ? linha.horasBloqueadas === 0
                  : Math.round(linha.horasBloqueadas) === horas;
              return (
                <button
                  key={horas}
                  type="button"
                  aria-pressed={escolhido}
                  disabled={marcandoPlantao}
                  onClick={() => onMarcarPlantao(horas)}
                  className={`min-h-11 rounded-control border px-3 text-sm disabled:opacity-50 ${
                    escolhido
                      ? "border-primary bg-primary text-primaryInk"
                      : "border-edge bg-surface text-ink"
                  }`}
                >
                  {horas === 0 ? "Não" : `${horas}h`}
                </button>
              );
            })}
          </div>
          {/* Quem já tinha um compromisso de outra duração (8h, por exemplo)
              não pode vê-lo sumir dos atalhos como se não existisse. */}
          {linha.horasBloqueadas > 0
          && !HORAS_DE_TRABALHO.some((h) => h === Math.round(linha.horasBloqueadas)) ? (
            <p className="mt-2 font-mono text-micro tabular-nums text-muted">
              hoje: {linha.horasBloqueadas}h
            </p>
          ) : null}
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
  onMarcarPlantao,
  marcandoPlantao,
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
  /** Devolve se gravou. A linha de estado nao pode AFIRMAR sem saber. */
  onSalvar: (disponibilidade: Record<string, number>) => Promise<boolean>;
  /** Cria ou remove o compromisso semanal daquele dia. `horas: 0` remove. */
  onMarcarPlantao: (diaDaSemana: number, horas: number) => void;
  marcandoPlantao: boolean;
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

  // ⚠️ A SEMANA GRAVA SOZINHA, e o botao "Salvar a rotina" deixou de existir.
  //
  // Ele era o ultimo lugar da tela onde o aluno tinha de confirmar: o perfil ja
  // gravava sozinho, e os atalhos de plantao (abaixo) tambem. Tres modelos de
  // gravacao na MESMA tela -- dois deles dentro da mesma linha aberta -- e o
  // tipo de incoerencia que faz a pessoa tocar num chip e ficar sem saber se
  // valeu. E como as Definicoes do iPhone: escolher E' guardar.
  //
  // O atraso junta rajada: quem ajusta os sete dias seguidos manda UMA
  // requisicao, e nao sete -- cada uma delas invalida quatro caches e refaz o
  // plano no servidor.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [estado, setEstado] = useState<"parado" | "guardado" | "falhou">("parado");

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  function escolher(indice: number, minutos: number) {
    const proxima = { ...atual, [String(indice)]: minutos };
    // ⚠️ O rascunho NAO e' limpo depois de gravar. Limpa-lo devolveria a tela
    // ao `disponibilidade` antigo ate a resposta chegar -- os chips piscariam
    // de volta ao valor anterior no meio da gravacao.
    setRascunho(proxima);
    setEstado("parado");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void onSalvar(proxima).then((ok) => setEstado(ok ? "guardado" : "falhou"));
    }, ATRASO_MS);
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
            onMarcarPlantao={(horas) => onMarcarPlantao(linha.indice, horas)}
            marcandoPlantao={marcandoPlantao}
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
            <strong className="font-medium">{horasPorExtenso(resumo.minutosTotais)}</strong> por
            semana — cerca de {resumo.questoes} questões
            {ritmoEhDoAluno
              ? ", no seu ritmo"
              : `, supondo ${minutosPorQuestao} min por questão`}
            .{diasAteAProva !== null ? ` Faltam ${diasAteAProva} dias até a sua prova.` : ""}
          </>
        )}
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {/* O rotulo mudou junto com o escopo. O que se repete toda semana
            resolve-se na linha acima; esta folha ficou com o que ela faz
            melhor -- uma DATA especifica e a escala 24x72. */}
        <Button variant="secondary" onClick={onAdicionar}>
          Plantão numa data específica
        </Button>
        {/* Discreto de proposito: quem grava sozinho nao pede aplauso. O
            `aria-live` e' o que faz a confirmacao existir para quem usa leitor
            de tela, onde a mudanca de cor de um texto nao existe. */}
        <p className="font-mono text-micro text-muted" aria-live="polite">
          {salvando
            ? "guardando"
            : estado === "guardado"
              ? "guardado"
              : estado === "falhou"
                ? "não deu para guardar"
                : ""}
        </p>
      </div>
    </section>
  );
}
