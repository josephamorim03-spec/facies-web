"use client";

import Link from "next/link";
import { TriangleAlert as AlertTriangle, BookOpen, Calendar, CheckCheck as CheckCircle2, Clock as Clock3, Copy, List as ListBox, Repeat } from "lucide-react";

import AreaDot from "@/components/AreaDot";
import { displayAreaLabel, resolveDisplayArea } from "@/lib/areaDisplay";
import type { StudentAgendaItem } from "@/lib/api";

/**
 * Icone por TIPO de item, nao por status.
 *
 * O fallback anterior era um relogio para tudo que nao tinha area — e revisao de
 * flashcards e transversal, nao tem area. Resultado: "Cards no ponto" aparecia
 * com mostrador de relogio, que e' o que o aluno reportou.
 *
 * O relogio sobra so para `calendar_event`, onde ele e' literal: um bloco de
 * tempo reservado na agenda.
 */
const KIND_ICON: Record<StudentAgendaItem["kind"], typeof Copy> = {
  flashcard_review: Copy,
  question_session: ListBox,
  review_task: Repeat,
  directed_study: BookOpen,
  plan_activity: BookOpen,
  calendar_event: Clock3,
};

const STATUS_LABEL: Record<StudentAgendaItem["status"], string> = {
  scheduled: "Prevista",
  pending: "Pendente",
  in_progress: "Em andamento",
  done: "Concluída",
  overdue: "Atrasada",
  skipped: "Ignorada",
};

export function AgendaItemRow({ item }: { item: StudentAgendaItem }) {
  const area = item.area ? resolveDisplayArea(item.area, item.title, item.rationale) : null;
  const manageHref = `/cronograma/mes?anchor=${item.date}&day=${item.date}`;
  const KindIcon = KIND_ICON[item.kind] ?? Clock3;

  return (
    <li data-agenda-occurrence-id={item.occurrence_id} className="py-3">
      <div className="flex min-w-0 items-center gap-3">
      {area ? (
        <AreaDot area={area} size="md" />
      ) : item.status === "done" ? (
        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
      ) : item.status === "overdue" ? (
        <AlertTriangle className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
      ) : (
        <KindIcon className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        {item.href ? (
          <Link href={item.href} className="block truncate text-sm font-medium text-ink hover:text-primary hover:underline">
            {item.title}
          </Link>
        ) : (
          <p className="truncate text-sm font-medium text-ink">{item.title}</p>
        )}
        {/* A linha de meta e MONO, e nao sans.
            Area, quantidade e tempo sao DADO -- e a mono e a textura de dado
            deste sistema, a mesma dos rotulos e dos numeros. Medido contra o
            artboard `8b`: o desenho poe 20 dos 31 nos de texto em mono
            (65%) e o Hoje estava em 28%, o que fazia a tela ler como um app
            sans qualquer em vez do prontuario que o resto do produto e. */}
        <p className="mt-0.5 truncate font-mono text-micro tabular-nums text-muted">
          {area ? `${displayAreaLabel(area)} · ` : ""}
          {item.expected_questions > 0 ? `${item.expected_questions} q · ` : ""}
          {item.estimated_minutes > 0 ? `${item.estimated_minutes} min` : "Agenda"}
        </p>
        {/* O PORQUE, que existia e nunca aparecia.

            `item.rationale` chega do backend desde sempre e era usado numa linha
            so — como pista para `resolveDisplayArea` adivinhar a cor da area.
            O dado estava na tela sem nunca ser lido por ninguem.

            A anotacao do artboard `8b` diz por que ele importa: "Cada bloco do
            dia diz POR QUE esta ali, com uma frase que cita a prova ou o seu
            historico. Sem isso a sessao vira uma lista."

            13px (`text-nota`) e o tamanho medido no artboard, e o degrau que o
            Tailwind nao tem — em 12 a frase vira rodape, em 14 compete com o
            titulo do bloco.

            ⚠️ SEM `truncate`, ao contrario das linhas acima. A frase e o
            argumento; cortada no meio ela vira ruido com reticencias. Ela
            quebra em duas linhas quando precisar.

            ⚠️ E o nosso conteudo ainda esta AQUEM do desenho. O `8b` diz "A
            UNIFESP cobrou em 4 das ultimas 5 provas. Voce acerta 52%" — duas
            citacoes, banca e historico. `student_agenda.py` hoje devolve frases
            como "Revisao programada pelo ciclo de aprendizagem", que explica o
            mecanismo e nao a pessoa. Exibir o que existe e melhor que esconder,
            e deixa a lacuna visivel em vez de teorica. */}
        {item.rationale ? (
          <p className="mt-1 text-nota text-muted">{item.rationale}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 text-xs ${
          item.status === "overdue"
            ? "text-warning"
            : item.status === "done"
              ? "text-success"
              : item.status === "in_progress"
                ? "text-primary"
                : "text-muted"
        }`}
      >
        {STATUS_LABEL[item.status]}
      </span>
      </div>
      {item.capabilities.can_start || item.capabilities.can_edit || item.capabilities.can_reschedule ? (
        <div className="mt-2 flex flex-wrap justify-end gap-x-4 gap-y-2 text-xs">
          {item.capabilities.can_start && item.href ? (
            <Link href={item.href} className="text-primary hover:underline" aria-label={`${item.status === "in_progress" ? "Continuar" : "Iniciar"} ${item.title}`}>
              {item.status === "in_progress" ? "Continuar" : "Iniciar"}
            </Link>
          ) : null}
          {item.capabilities.can_edit ? (
            <Link href={manageHref} className="text-primary hover:underline" aria-label={`Editar ${item.title}`}>
              Editar
            </Link>
          ) : null}
          {item.capabilities.can_reschedule ? (
            <Link href={manageHref} className="text-primary hover:underline" aria-label={`Reagendar ${item.title}`}>
              Reagendar
            </Link>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}
