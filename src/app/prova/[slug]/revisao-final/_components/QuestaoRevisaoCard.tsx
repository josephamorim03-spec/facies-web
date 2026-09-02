import type { QuestaoRevisao } from "@/lib/revisao";

/**
 * Uma questão da revisão, no formato do ebook.
 *
 * ## Por que o gabarito aparece inline, e não escondido
 *
 * Isto é um documento de REVISÃO, não um auto-teste: a pessoa abre para reler o
 * que a prova cobra no assunto, não para ser medida. Esconder o gabarito atrás
 * de um clique serviria ao formato errado — e a premissa do produto já é publicar
 * estas 30 questões COM gabarito (D-privacidade da spec). Quem quer resolver sem
 * ver a resposta tem a versão do app, onde o gabarito só aparece depois.
 *
 * ## O comentário entra quando é nosso, e some quando não é
 *
 * `comentario` é `null` hoje (cobertura 0 na base — D10). O cartão não inventa
 * texto nem deixa um buraco: sem comentário, mostra só gabarito e fonte. Quando
 * o diagnóstico existir, ele aparece por distrator.
 */
export function QuestaoRevisaoCard({
  questao,
  numero,
}: {
  questao: QuestaoRevisao;
  numero: number;
}) {
  const letras = Object.keys(questao.alternativas).sort();
  const comentarios = questao.comentario
    ? Object.entries(questao.comentario)
    : [];

  return (
    <article className="bg-surface px-4 py-4 sm:px-5 sm:py-5 print:break-inside-avoid">
      <p className="text-base/[1.6] text-ink">
        <span className="mr-2 font-mono text-sm text-muted">
          {String(numero).padStart(2, "0")}
        </span>
        <span className="whitespace-pre-line">{questao.enunciado}</span>
      </p>

      <ul className="mt-4 space-y-2">
        {letras.map((letra) => {
          const correta = letra === questao.gabarito;
          return (
            <li key={letra} className="flex gap-3 text-base/[1.5]">
              <span
                className={`w-5 shrink-0 font-mono font-semibold ${
                  correta ? "text-ink" : "text-muted"
                }`}
              >
                {letra}
              </span>
              <span className={correta ? "font-medium text-ink" : "text-ink"}>
                {questao.alternativas[letra]}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-4 border-t border-rule pt-3">
        <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
          <span>
            <span className="paper-eyebrow">gabarito</span>{" "}
            <span className="font-mono text-base font-semibold text-ink">
              {questao.gabarito}
            </span>
          </span>
          {questao.ano ? (
            <span className="text-muted">
              {questao.fonte} · {questao.ano}
            </span>
          ) : null}
        </p>

        {comentarios.length > 0 ? (
          <dl className="mt-3 space-y-1.5">
            {comentarios.map(([letra, texto]) => (
              <div key={letra} className="flex gap-3 text-sm/[1.5]">
                <dt className="w-5 shrink-0 font-mono font-semibold text-muted">
                  {letra}
                </dt>
                <dd className="text-muted">{texto}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </article>
  );
}
