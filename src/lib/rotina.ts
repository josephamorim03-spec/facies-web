import type { CalendarEventOut } from "@/lib/api/domains/calendar";
// ⚠️ Import RELATIVO, e nao `@/`, nos dois de VALOR.
//
// `npm run test:unit` roda `node --test --experimental-strip-types` sem o
// alias-loader: o `@/` de um import de TIPO some na remocao de tipos, mas o de
// valor chega ao runtime e estoura `ERR_MODULE_NOT_FOUND`. Modulo puro que
// existe para ser testado importa por caminho relativo.
import {
  OTHER_EVENT_PREFIX,
  SKIP_ROUTINE_PREFIX,
  WORK_EVENT_PREFIX,
} from "../app/desempenho/_lib/perfilShared.ts";
import {
  filterEffectivePunctualEvents,
  filterEffectiveRoutineEvents,
} from "./calendarEventVisibility.ts";

/**
 * A semana padrão do artboard `14a`, derivada do que já está persistido.
 *
 * ## Por que DERIVAR, e não guardar um "tipo de dia"
 *
 * O desenho mostra sete linhas com um tipo cada — plantão 24h, pós-plantão,
 * livre, ambulatório. A tentação é criar uma coluna `day_type`. Ela seria uma
 * terceira verdade sobre o mesmo dia, ao lado dos `calendar_events` (que o
 * cronograma já usa para bloquear carga) e do `study_availability` (que o
 * motor já usa para dimensionar). Três fontes divergem; duas já bastam.
 *
 * Então o tipo é uma LEITURA: as horas bloqueadas dizem se o dia é plantão, e
 * o dia seguinte a um plantão longo é pós-plantão.
 *
 * ## O limiar é o do motor, não um novo
 *
 * `event_rules.py` trata 20h como a fronteira do plantão longo
 * (`POST_48H_HEAVY_DAY_THRESHOLD`) e é ela que produz o dia de recuperação. O
 * front usa o MESMO 20, senão a tela chamaria de plantão um dia que o
 * planejamento não trata como tal.
 */

/** 0 = segunda … 6 = domingo — a numeração única do produto (`date.weekday()`). */
export const DIAS_DA_SEMANA = [
  { indice: 0, curto: "seg" },
  { indice: 1, curto: "ter" },
  { indice: 2, curto: "qua" },
  { indice: 3, curto: "qui" },
  { indice: 4, curto: "sex" },
  { indice: 5, curto: "sáb" },
  { indice: 6, curto: "dom" },
] as const;

/** Fronteira do plantão longo, em horas. Espelha `POST_48H_HEAVY_DAY_THRESHOLD`. */
export const HORAS_DE_PLANTAO_LONGO = 20;
/** Fronteira do plantão, em horas. Espelha `CONSTRAINED_DAY_HOURS`. */
export const HORAS_DE_PLANTAO = 10;

export type TipoDeDia = "plantao" | "pos_plantao" | "trabalho" | "livre";

export type LinhaDaSemana = {
  indice: number;
  curto: string;
  tipo: TipoDeDia;
  /** O que a linha escreve: "Plantão 24h", "Pós-plantão", "Ambulatório", "Livre". */
  rotulo: string;
  /** Minutos declarados para este dia. `null` = nunca declarado. */
  minutos: number | null;
  horasBloqueadas: number;
};

function semPrefixo(label: string): string {
  for (const prefixo of [WORK_EVENT_PREFIX, OTHER_EVENT_PREFIX, SKIP_ROUTINE_PREFIX]) {
    if (label.startsWith(prefixo)) return label.slice(prefixo.length).trim();
  }
  return label.trim();
}

function horasPorDia(
  eventos: CalendarEventOut[],
  hojeISO: string,
): Map<number, CalendarEventOut[]> {
  const porDia = new Map<number, CalendarEventOut[]>();
  // ⚠️ `hojeISO` NAO e' enfeite: rotina removida continua na lista com
  // `active_until` no passado (remocao e' suave, para o historico nao mentir).
  // Sem o filtro, a semana mostraria plantao que o aluno ja' tirou.
  for (const evento of filterEffectiveRoutineEvents(eventos, hojeISO)) {
    if (evento.weekday == null) continue;
    const atual = porDia.get(evento.weekday) ?? [];
    atual.push(evento);
    porDia.set(evento.weekday, atual);
  }
  return porDia;
}

/**
 * As sete linhas da semana padrão.
 *
 * `disponibilidade` vem de `study_availability` (`"0".."6"` → minutos). Chave
 * ausente é `null` — "nunca declarou" — e NÃO zero: zero é uma decisão do
 * aluno ("nada"), e tratar as duas como a mesma coisa é o que fazia todo dia
 * parecer descanso.
 */
export function semanaPadrao(
  eventos: CalendarEventOut[],
  disponibilidade: Record<string, number> | null | undefined,
  hojeISO: string,
): LinhaDaSemana[] {
  const porDia = horasPorDia(eventos, hojeISO);

  const horasDe = (indice: number): number =>
    (porDia.get(indice) ?? []).reduce((soma, e) => soma + (e.duration_hours || 0), 0);

  return DIAS_DA_SEMANA.map(({ indice, curto }) => {
    const doDia = porDia.get(indice) ?? [];
    const horas = horasDe(indice);
    // O dia ANTERIOR na semana circular: domingo (6) vem depois de sábado (5),
    // e segunda (0) vem depois de domingo (6).
    const vespera = horasDe((indice + 6) % 7);

    const bruto = disponibilidade?.[String(indice)];
    const minutos = typeof bruto === "number" ? Math.max(0, Math.trunc(bruto)) : null;

    let tipo: TipoDeDia = "livre";
    let rotulo = "Livre";

    if (horas >= HORAS_DE_PLANTAO) {
      tipo = "plantao";
      rotulo = `Plantão ${Math.round(horas)}h`;
    } else if (horas > 0) {
      tipo = "trabalho";
      // O rótulo do próprio evento é mais informativo que "Trabalho": quem
      // escreveu "Ambulatório" quer ler "Ambulatório".
      rotulo = semPrefixo(doDia[0]?.label ?? "") || "Trabalho";
    } else if (vespera >= HORAS_DE_PLANTAO_LONGO) {
      tipo = "pos_plantao";
      rotulo = "Pós-plantão";
    }

    return { indice, curto, tipo, rotulo, minutos, horasBloqueadas: horas };
  });
}

/** "nada" · "10 min" · "1 h" · "1 h 30" — nunca "0 min". */
export function minutosPorExtenso(minutos: number | null): string {
  if (minutos === null) return "—";
  if (minutos <= 0) return "nada";
  if (minutos < 60) return `${minutos} min`;
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  return resto === 0 ? `${horas} h` : `${horas} h ${resto}`;
}

/** "4h20" — o formato do resumo do `14a`. */
export function horasPorExtenso(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const resto = minutos % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas}h`;
  return `${horas}h${String(resto).padStart(2, "0")}`;
}

export type ResumoDaSemana = {
  minutosTotais: number;
  /** Questões que cabem na semana, pela taxa recebida. */
  questoes: number;
  /** Dias com algum tempo declarado. */
  diasComEstudo: number;
  /** Nenhum dia declarado ainda. */
  vazia: boolean;
};

/**
 * Quanto cabe na semana.
 *
 * `minutosPorQuestao` NÃO tem valor padrão de propósito: quem chama tem de
 * dizer se está usando o ritmo medido do aluno ou a constante de planejamento,
 * porque a frase muda ("no seu ritmo" vs "supondo 2 min"). Um default aqui
 * viraria a constante disfarçada de medida.
 */
export function resumoDaSemana(
  linhas: LinhaDaSemana[],
  minutosPorQuestao: number,
): ResumoDaSemana {
  const declarados = linhas.filter((linha) => linha.minutos !== null);
  const minutosTotais = declarados.reduce((soma, linha) => soma + (linha.minutos ?? 0), 0);
  const taxa = minutosPorQuestao > 0 ? minutosPorQuestao : 1;
  return {
    minutosTotais,
    questoes: Math.floor(minutosTotais / taxa),
    diasComEstudo: linhas.filter((linha) => (linha.minutos ?? 0) > 0).length,
    vazia: declarados.length === 0,
  };
}

/** As exceções desta semana: eventos pontuais entre hoje e hoje+6. */
export function excecoesDaSemana(
  eventos: CalendarEventOut[],
  hojeISO: string,
): CalendarEventOut[] {
  const hoje = new Date(`${hojeISO}T00:00:00`);
  const fim = new Date(hoje);
  fim.setDate(fim.getDate() + 6);
  return filterEffectivePunctualEvents(eventos)
    .filter((evento) => {
      if (!evento.event_date) return false;
      const dia = new Date(`${evento.event_date}T00:00:00`);
      return dia >= hoje && dia <= fim;
    })
    .sort((a, b) => (a.event_date ?? "").localeCompare(b.event_date ?? ""));
}

export function rotuloDaExcecao(evento: CalendarEventOut): string {
  const nome = semPrefixo(evento.label) || "Compromisso";
  const horas = evento.duration_hours ? ` (${Math.round(evento.duration_hours)}h)` : "";
  return `${nome}${horas}`;
}
