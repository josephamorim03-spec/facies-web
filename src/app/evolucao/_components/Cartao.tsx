import type { ReactNode } from "react";

/**
 * A casca dos sete cartões da Evolução — artboards `9b` e `12a`.
 *
 * ## O título é a PERGUNTA que o médico faz em voz alta
 *
 * "Estou melhorando?", "Vou dar conta do tempo?", "O que eu vou esquecer?" — e
 * não "Acurácia", "Ritmo", "Retenção". É o oposto de um painel de indicadores:
 * quem lê não precisa traduzir a métrica para a sua dúvida.
 *
 * ## O rótulo em mono é o que dá a textura de prontuário
 *
 * A linha sob o título é `paper-eyebrow` (mono, 11px, 400) e diz o que a medida
 * É — "acerto por semana", "questões perdidas · peso × seu erro". Ela não é
 * decoração: é a procedência do número.
 */
export function Cartao({
  pergunta,
  medida,
  children,
  nota,
}: {
  pergunta: string;
  /** O que a medida é, em mono. */
  medida?: string;
  children: ReactNode;
  /** A leitura em uma frase, sob o conteúdo. */
  nota?: ReactNode;
}) {
  return (
    <section className="rounded-surface border border-edge bg-surface p-4 sm:p-5">
      <h2 className="font-serif font-semibold text-ink">{pergunta}</h2>
      {medida ? <p className="paper-eyebrow mt-1">{medida}</p> : null}
      <div className="mt-4">{children}</div>
      {nota ? <p className="mt-3 text-nota leading-6 text-muted">{nota}</p> : null}
    </section>
  );
}

/** Um número grande, em mono — a textura de dado do sistema. */
export function Numero({
  valor,
  unidade,
  className = "",
}: {
  valor: ReactNode;
  unidade?: string;
  className?: string;
}) {
  return (
    <p className={`font-mono tabular-nums leading-none text-ink ${className}`}>
      <span className="text-[2.125rem]">{valor}</span>
      {unidade ? <span className="ml-1 text-nota text-muted">{unidade}</span> : null}
    </p>
  );
}

/**
 * O estado que o produto usa quando não tem base — e ele é uma FRASE, não um
 * traço. "Não avaliado" sozinho parece defeito; dizer o que falta para medir é
 * o que transforma ausência em próximo passo.
 */
export function SemBase({ children }: { children: ReactNode }) {
  return <p className="text-sm leading-6 text-muted">{children}</p>;
}
