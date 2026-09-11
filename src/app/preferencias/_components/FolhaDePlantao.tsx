"use client";

import { useMemo, useState } from "react";

import { Sheet } from "@/components/ui/Sheet";
import { createEvent, listEvents, type CalendarEventOut } from "@/lib/api/domains/calendar";
import { encodeEventLabel } from "@/lib/perfil/perfilShared";
import { getErrorMessage } from "@/lib/error-utils";

/**
 * "Adicionar plantão" — o artboard `14b`.
 *
 * ## O que este botão fazia antes
 *
 * Rolava. `onAdicionar` chamava `scrollIntoView` até um painel genérico
 * ~150 linhas abaixo, na seção seguinte, chamado "Adicionar compromisso" — com
 * um `<select>` de oito durações, dois botões de cadência e um campo de **nome
 * obrigatório**. O médico tocava em "adicionar plantão" e a tela deslizava para
 * outro assunto.
 *
 * ## Nada de nome do hospital
 *
 * O artboard é literal: *"nada de nome do hospital: o plano não muda com o
 * lugar, e todo campo que não muda nada é trabalho cobrado do médico à toa"*.
 * O painel antigo BLOQUEAVA sem nome ("Informe o nome do compromisso"). Aqui o
 * nome é opcional e o rótulo se deriva da duração.
 *
 * ## As três perguntas que sobraram
 *
 * Quando · quanto tempo · repete? A quarta do artboard — *"dá para estudar
 * neste dia?"* — **não está aqui de propósito**: ela já existe, com a mesma
 * copy e os mesmos atalhos, dentro da linha do tipo de dia em `MinhaSemana`. E
 * lá ela está no lugar certo, porque a disponibilidade é por TIPO de dia e não
 * por data: pô-la aqui daria a impressão de valer só para este plantão, quando
 * ela vale para todos.
 *
 * ## ⚠️ O que o contrato NÃO guarda, e por isso não é oferecido
 *
 * Quatro coisas do artboard não existem em `CalendarEventCreate`
 * (`app/api/schemas/events.py`), e nenhuma é fingida aqui:
 *
 * 1. **Hora de início.** Só há `duration_hours`. O "fim calculado 07:00 →
 *    07:00 de amanhã" do desenho é impossível sem `start_time`.
 * 2. **Recorrência.** Só `weekday` (toda semana) ou `event_date` (uma vez).
 *    A escala 24×72 é expandida AQUI, em N eventos pontuais — funciona, e a
 *    remoção usa `scope: "future"`, que já existe. É o candidato claro a um
 *    `series_id` no backend: hoje, apagar a escala é apagar evento a evento.
 * 3. **`kind: "shift"`.** O onboarding aceita `shift`, e
 *    `onboarding_service.py:244` o COLAPSA em `__WORK__`. Plantão não sobrevive
 *    como dado: ele é derivado das horas (≥10h) em `lib/rotina.ts`.
 * 4. **Pós-plantão declarado.** Também derivado (véspera ≥20h). Um plantão de
 *    12h nunca produz pós-plantão, mesmo que o médico diga que sim.
 */

const DURACOES = [24, 12, 6] as const;
const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"] as const;

/** A cada 4 dias: 24 de plantão, 72 de folga. É o preset mais comum da escala. */
const PASSO_DA_ESCALA = 4;
/** Sem data de prova, projeta oito semanas — o horizonte que o plano usa. */
const HORIZONTE_PADRAO = 56;

function somaDias(iso: string, dias: number): string {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + dias);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function FolhaDePlantao({
  aberta,
  token,
  hojeISO,
  diasAteAProva,
  onFechar,
  onCriado,
}: {
  aberta: boolean;
  token: string;
  hojeISO: string;
  diasAteAProva: number | null;
  onFechar: () => void;
  onCriado: (eventos: CalendarEventOut[]) => void;
}) {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [cadencia, setCadencia] = useState<"uma" | "semanal" | "escala">("uma");
  const [data, setData] = useState(hojeISO);
  const [diaDaSemana, setDiaDaSemana] = useState(0);
  const [horas, setHoras] = useState<number>(24);
  const [outraAberta, setOutraAberta] = useState(false);

  const horizonte = diasAteAProva ?? HORIZONTE_PADRAO;

  /** As datas da escala, do dia escolhido até o horizonte, de 4 em 4. */
  const repeticoes = useMemo(() => {
    if (cadencia !== "escala") return [];
    const datas: string[] = [];
    for (let salto = PASSO_DA_ESCALA; salto <= horizonte; salto += PASSO_DA_ESCALA) {
      datas.push(somaDias(data, salto));
    }
    return datas;
  }, [cadencia, data, horizonte]);

  /**
   * O alcance, dito ANTES de guardar.
   *
   * O artboard fecha com isto, e a promessa da segunda frase é a que ninguém
   * faz: mudar a rotina não apaga histórico. Ela é verdade porque a remoção é
   * suave (`active_until` + `scope: "future"`), não porque é simpática.
   */
  const alcance = useMemo(() => {
    if (cadencia === "uma") return "Isto muda um dia.";
    if (cadencia === "semanal") {
      const semanas = Math.floor(horizonte / 7);
      return diasAteAProva === null
        ? "Isto vale toda semana, até você mudar."
        : `Isto muda ${semanas} ${semanas === 1 ? "dia" : "dias"} até a prova.`;
    }
    const total = repeticoes.length + 1;
    return `Isto muda ${total} ${total === 1 ? "dia" : "dias"}${
      diasAteAProva === null ? " nas próximas oito semanas" : " até a prova"
    }.`;
  }, [cadencia, diasAteAProva, horizonte, repeticoes.length]);

  /**
   * ⚠️ A ESCALA 24x72 E' EXPANDIDA AQUI, e nao no backend.
   *
   * `CalendarEventCreate` so' conhece "toda semana" (`weekday`) e "uma vez"
   * (`event_date`) -- nao ha campo de recorrencia. A escala vira N eventos
   * pontuais, criados em sequencia. Funciona, e a remocao suave por
   * `scope: "future"` continua valendo -- mas apagar a escala hoje e' apagar
   * evento a evento, e por isso ela e' o candidato claro a um `series_id` no
   * contrato.
   *
   * O ROTULO E' DERIVADO, e o artboard e' literal sobre isso: "nada de nome do
   * hospital -- o plano nao muda com o lugar, e todo campo que nao muda nada e'
   * trabalho cobrado do medico a toa". 10h e' o limiar que `lib/rotina.ts` usa
   * para chamar o dia de plantao; abaixo dele o rotulo diz o que o dia e'.
   */
  async function guardar() {
    // Sem guard de `token`: ver `lib/auth.ts:29` — ele e' sempre "" por
    // desenho, e a sessao vai por cookie httpOnly.
    if (salvando) return;
    setErro(null);
    setSalvando(true);
    const rotulo = horas >= 10 ? `Plantão ${horas}h` : `Trabalho ${horas}h`;
    const ehSemanal = cadencia === "semanal";
    try {
      const datas = ehSemanal ? [null] : [data, ...repeticoes];
      for (const quando of datas) {
        await createEvent(token, {
          label: encodeEventLabel(rotulo, "work"),
          event_type: ehSemanal ? "routine" : "event",
          weekday: ehSemanal ? diaDaSemana : null,
          event_date: ehSemanal ? null : quando,
          duration_hours: horas,
        });
      }
      onCriado(await listEvents(token));
      onFechar();
    } catch (causa) {
      setErro(getErrorMessage(causa, "Não foi possível guardar o plantão."));
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet open={aberta} onClose={onFechar} eyebrow="a sua rotina" title="Adicionar plantão">
      <fieldset>
        <legend className="paper-eyebrow">quando</legend>
        {cadencia === "semanal" ? (
          <div className="fileira-de-controles mt-2">
            {DIAS.map((dia, indice) => (
              <button
                key={dia}
                type="button"
                aria-pressed={diaDaSemana === indice}
                onClick={() => setDiaDaSemana(indice)}
                className={`min-h-11 rounded-control border px-3 text-sm ${
                  diaDaSemana === indice
                    ? "border-primary bg-washSelecao text-ink"
                    : "border-edge bg-surface text-ink"
                }`}
              >
                {dia}
              </button>
            ))}
          </div>
        ) : (
          <input
            type="date"
            value={data}
            min={hojeISO}
            onChange={(evento) => setData(evento.target.value)}
            className="mt-2 min-h-11 w-full rounded-control border border-edge bg-paper px-3 text-sm text-ink"
          />
        )}
      </fieldset>

      <fieldset className="mt-5">
        <legend className="paper-eyebrow">duração</legend>
        <div className="fileira-de-controles mt-2">
          {DURACOES.map((valor) => (
            <button
              key={valor}
              type="button"
              aria-pressed={!outraAberta && horas === valor}
              onClick={() => {
                setHoras(valor);
                setOutraAberta(false);
              }}
              className={`min-h-11 rounded-control border px-3 text-sm ${
                !outraAberta && horas === valor
                  ? "border-primary bg-washSelecao text-ink"
                  : "border-edge bg-surface text-ink"
              }`}
            >
              {valor}h
            </button>
          ))}
          {/* O campo livre no fim da mesma linha: quem faz 8h digita 8, sem
              escolher o atalho mais próximo. */}
          {outraAberta ? (
            <label className="inline-flex items-center gap-2">
              <span className="sr-only">Outra duração, em horas</span>
              <input
                type="number"
                min={1}
                max={24}
                value={horas}
                autoFocus
                onChange={(evento) =>
                  setHoras(Math.max(1, Math.min(24, Number(evento.target.value) || 1)))
                }
                className="min-h-11 w-20 rounded-control border border-primary bg-paper px-3 font-mono text-sm tabular-nums text-ink"
              />
              <span className="text-sm text-muted">h</span>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setOutraAberta(true)}
              className="min-h-11 rounded-control border border-edge bg-surface px-3 text-sm text-ink"
            >
              outra
            </button>
          )}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="paper-eyebrow">repete?</legend>
        <div className="mt-2 space-y-2">
          {(
            [
              ["uma", "Só neste dia", null],
              ["escala", "Escala 24 × 72", "a cada 4 dias"],
              ["semanal", "Toda semana, no mesmo dia", null],
            ] as const
          ).map(([valor, rotulo, nota]) => (
            <label
              key={valor}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-control border border-edge bg-surface px-3"
            >
              <input
                type="radio"
                name="repeticao"
                checked={cadencia === valor}
                onChange={() => setCadencia(valor)}
                className="h-4 w-4 accent-ink"
              />
              <span className="text-sm text-ink">
                {rotulo}
                {nota ? <span className="ml-2 text-nota text-muted">{nota}</span> : null}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {erro ? (
        <p className="mt-4 text-nota text-danger" role="alert">
          {erro}
        </p>
      ) : null}

      <p className="mt-5 border-t border-rule pt-4 text-nota leading-6 text-muted">
        {alcance} Nada do que você já respondeu se perde.
      </p>

      {/* ⚠️ A quarta pergunta do artboard mora na linha do tipo de dia, e o
          rodapé diz onde. A disponibilidade é por TIPO, não por data. */}
      <p className="mt-2 text-micro leading-5 text-muted">
        Quanto dá para estudar em dia de plantão se ajusta na linha do dia, aqui na Minha semana.
      </p>

      <button
        type="button"
        onClick={() => void guardar()}
        disabled={salvando}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-control border border-primary bg-primary px-5 text-sm font-medium text-primaryInk transition-colors hover:border-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)] disabled:opacity-50"
      >
        {salvando ? "Guardando…" : "Guardar"}
      </button>
    </Sheet>
  );
}
