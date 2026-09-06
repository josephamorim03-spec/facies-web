"use client";

import { displayAreaLabel, resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_VAR } from "@/lib/areaIdentity";
import type { StudentTodayAction } from "@/lib/api";
import { TodayActionCTA } from "./TodayActionCTA";

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    trainer: "Treinador",
    question_bank: "Banco de questões",
    schedule: "Agenda",
    flashcards: "Flashcards",
    student_experience: "Hoje",
  };
  return labels[source] ?? source;
}

export function TodayPrimaryAction({ action }: { action: StudentTodayAction }) {
  // Mesma cascata do heroi antigo: codigo do servidor primeiro, inferencia pelo
  // texto depois, `OU` como ultimo recurso. O campo `area` do contrato so torna
  // o primeiro passo confiavel -- o resultado visivel continua o mesmo.
  const area = resolveDisplayArea(action.area, action.title, action.rationale);

  return (
    <section
      aria-label="Próxima ação"
      className="paper-surface overflow-hidden"
    >
      {/* ⚠️ FILETE, E NAO CAIXA DE ICONE.
          Aqui havia um bloco de 44px de icone que, no celular, virava uma FAIXA
          CINZENTA de largura inteira: quase um quarto da altura do cartao gasto
          num simbolo. O artboard `8b` nao tem essa caixa -- a area aparece como
          um fio de 4px, a mesma regra do mapa ("a cor da area so aparece
          saturada no filete").
          O nome da area continua legivel por leitor de tela, que e o que a caixa
          de fato entregava. */}
      <div className="flex flex-col sm:flex-row sm:items-stretch">
        <div
          className="h-1 w-full shrink-0 sm:h-auto sm:w-1"
          style={{ backgroundColor: AREA_VAR[area] }}
          aria-hidden="true"
        />
        <span className="sr-only">{displayAreaLabel(area)}</span>
        <div className="flex min-w-0 flex-1 flex-col gap-5 px-4 py-5 sm:px-6 sm:py-6 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0 space-y-3">
            <div className="paper-eyebrow flex flex-wrap items-center gap-2">
              <span>Sua próxima ação</span>
              <span aria-hidden="true">/</span>
              <span>{sourceLabel(action.source)}</span>
              {action.estimated_minutes !== null && action.estimated_minutes > 0 ? (
                <>
                  <span aria-hidden="true">/</span>
                  <span>{action.estimated_minutes} min</span>
                </>
              ) : null}
            </div>
            <div>
              {/* Escala em `.tela-app h2` — ver `globals.css`. */}
              <h2 className="font-serif font-semibold text-ink">
                {action.title}
              </h2>
              {/* `font-serif` explicito. Era obrigatorio quando `--font-sans`
                  apontava para a mono: prosa sem familia declarada virava
                  monoespacada. Hoje o sans e humanista e nada quebraria, mas a
                  linha fica — a serifa no enunciado clinico e escolha de leitura
                  (§5.2), nao consequencia de qual fonte o resto usa. */}
              <p className="mt-3 max-w-2xl font-serif text-sm leading-6 text-muted sm:text-base">
                {action.rationale}
              </p>
            </div>
          </div>
          <TodayActionCTA
            action={action}
            className="inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-control border border-primary bg-primary px-5 text-sm font-medium text-primaryInk transition-colors hover:border-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:translate-y-px md:w-auto"
          >
            {action.cta_label}
          </TodayActionCTA>
        </div>
      </div>
    </section>
  );
}
