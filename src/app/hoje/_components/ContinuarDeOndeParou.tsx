import Link from "next/link";

import type { StudentToday } from "@/lib/api";

/**
 * A retomada do dia começado — artboard `13e`.
 *
 * ## O dado chegava e ninguém o mostrava
 *
 * `student-today-v1` carrega `details.active_session` desde sempre: id, título,
 * área, quantas já foram respondidas e de quantas. Nenhuma tela lia. Quem
 * fechava o app no meio de uma sessão voltava para "Sua próxima ação" — a
 * proposta de COMEÇAR algo, com a sessão aberta escondida no Histórico.
 *
 * O `13e` desenha o estado que o plantonista mais encontra: o dia no meio. E o
 * botão dele diz o nome do bloco e quantas faltam, não "continuar" seco — é a
 * mesma regra do CTA do banco, onde um rótulo que não dizia o que ia acontecer
 * já enganou o aluno uma vez.
 *
 * ## Ele vem ANTES da próxima ação, e não no lugar dela
 *
 * Retomar é mais barato que começar, e o produto não deve propor abrir uma
 * frente nova enquanto há uma aberta. Mas a próxima ação continua na tela: a
 * sessão pendente pode ser justamente a que o aluno decidiu abandonar.
 */
export function ContinuarDeOndeParou({
  sessao,
}: {
  sessao: NonNullable<StudentToday["details"]["active_session"]>;
}) {
  const faltam = Math.max(0, (sessao.total_questions ?? 0) - (sessao.answered_count ?? 0));
  const detalhe = [
    sessao.title,
    faltam > 0 ? `${faltam} ${faltam === 1 ? "questão" : "questões"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      aria-label="Sessão em andamento"
      className="rounded-surface border border-edge bg-surface p-4 sm:p-5"
    >
      <p className="paper-eyebrow">Você parou no meio</p>
      <p className="mt-2 text-sm leading-6 text-ink">
        {sessao.answered_count} de {sessao.total_questions} respondidas em{" "}
        <span className="font-semibold">{sessao.title}</span>.
      </p>
      <Link
        href={sessao.href}
        className="mt-3 inline-flex min-h-11 items-center rounded-control border border-primary bg-primary px-4 text-sm font-medium text-primaryInk"
      >
        Continuar de onde parou{detalhe ? ` · ${detalhe}` : ""}
      </Link>
    </section>
  );
}
