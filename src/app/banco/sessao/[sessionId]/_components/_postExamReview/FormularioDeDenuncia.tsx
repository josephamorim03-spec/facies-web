"use client";

import { Button } from "@/components/ui/Button";

/**
 * O formulário de denúncia de uma questão, no pós-prova.
 *
 * ## Por que é um módulo
 *
 * Saiu do `PostExamReview` porque o guard de arquitetura recusou o crescimento
 * dele (1040 linhas contra teto de 1013) com a regra da casa: *"o teto só desce:
 * extraia módulo em vez de subir o número"*. E o corte caiu bem — isto é um
 * formulário com estado próprio, montado condicionalmente sob UMA questão, e
 * nada no resto da revisão precisa de o conhecer.
 *
 * ⚠️ O ESTADO CONTINUA NO PAI, de propósito. `reportingPosition` decide qual
 * questão mostra o formulário, e `reportType`/`reportReason` são partilhados
 * entre aberturas — descer o estado para cá faria a escolha do aluno
 * desaparecer ao fechar e reabrir. Este componente desenha; quem lembra é o
 * `usePostExamReview`.
 */
export function FormularioDeDenuncia<T extends string>({
  opcoes,
  tipo,
  aoEscolherTipo,
  motivo,
  aoEscreverMotivo,
  ocupado,
  aoCancelar,
  aoEnviar,
}: {
  opcoes: ReadonlyArray<{ type: T; label: string }>;
  tipo: T;
  aoEscolherTipo: (tipo: T) => void;
  motivo: string;
  aoEscreverMotivo: (motivo: string) => void;
  ocupado: boolean;
  aoCancelar: () => void;
  aoEnviar: () => void;
}) {
  return (
    <div className="mt-3 rounded-control border border-edge bg-paper p-3">
      <div className="flex flex-wrap gap-2">
        {opcoes.map(({ type, label }) => (
          <button
            key={type}
            type="button"
            onClick={() => aoEscolherTipo(type)}
            className={[
              "border px-2.5 py-1 text-xs",
              tipo === type
                ? "border-primary bg-washSelecao text-ink"
                : "border-edge text-muted hover:text-ink",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={motivo}
        onChange={(evento) => aoEscreverMotivo(evento.target.value)}
        maxLength={4000}
        rows={3}
        className="mt-3 w-full rounded-control border border-edge bg-surface px-3 py-2 text-sm outline-none focus:border-primary"
        placeholder="O que parece errado nesta questão?"
      />
      {/* ⚠️ `.fileira-de-controles`, e não `justify-end`: os dois botões ficavam
          encostados à DIREITA com alvo de ~26px (`py-1.5 text-xs`) — o pior par
          possível num rodapé de formulário, onde errar o toque cancela o que se
          acabou de escrever. O helper põe-nos em colunas iguais no telemóvel e
          devolve a fileira `flex` a partir de 768px. */}
      <div className="fileira-de-controles mt-2">
        <Button type="button" variant="secondary" size="md" onClick={aoCancelar}>
          Cancelar
        </Button>
        <Button type="button" variant="primary" size="md" disabled={ocupado} onClick={aoEnviar}>
          Enviar denúncia
        </Button>
      </div>
    </div>
  );
}
