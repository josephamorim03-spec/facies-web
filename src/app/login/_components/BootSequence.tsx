"use client";

import { useEffect, useRef, useState } from "react";

import { BOOT_SEQUENCE_SEEN_KEY } from "@/lib/storage-keys";

/**
 * Cada linha nomeia um subsistema que existe de verdade. Inventar
 * "NEURAL ENGINE" seria a versão de marketing disto — e o aluno que abre o app
 * seis vezes por dia decora a lista. Ela precisa ser verdade.
 */
const LINES: { label: string; status: string }[] = [
  { label: "Banco de questões", status: "OK" },
  { label: "Motor adaptativo", status: "OK" },
  { label: "Agendador FSRS", status: "OK" },
  { label: "Perfil cognitivo", status: "OK" },
  { label: "Rota", status: "OK" },
];

/** Intervalo entre linhas. O total (~5×130ms) fica abaixo de 1s. */
const LINE_MS = 130;
const TAIL_MS = 320;

type Props = { onDone: () => void };

/**
 * POST de boot — a piscada de "isto é um software", não uma tela de carregamento.
 *
 * Quatro travas, todas porque a mesma pessoa vê isto muitas vezes:
 *
 * 1. **Uma vez por aba** (`sessionStorage`). Abrir o app de novo amanhã mostra;
 *    voltar para a aba de login não.
 * 2. **`prefers-reduced-motion` manda.** Quem pediu menos movimento ao sistema
 *    entra direto — uma sequência que aparece linha a linha É movimento.
 * 3. **Pulável por qualquer tecla, clique ou toque**, não só por um botão que
 *    precisa ser encontrado.
 * 4. **Menos de um segundo.** Se a marca precisa de mais que isso, o problema
 *    não é a duração.
 *
 * Não bloqueia autenticação: é overlay sobre o formulário, que já está montado
 * atrás. Quem digita rápido nem vê.
 */
export function BootSequence({ onDone }: Props) {
  const [visible, setVisible] = useState(false);
  const [shown, setShown] = useState(0);
  const doneRef = useRef(false);

  // A decisão depende de `sessionStorage` e `matchMedia`, que só existem no
  // cliente — então ela não pode virar estado inicial (o servidor renderizaria
  // diferente e a hidratação divergiria).
  //
  // Roda dentro de `requestAnimationFrame` e não direto no efeito: `setState`
  // síncrono em efeito dispara render em cascata, e o lint do projeto recusa —
  // com razão. Um quadro de atraso é imperceptível para uma sequência
  // decorativa, e a decisão passa a acontecer depois da primeira pintura.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      let seen = true;
      try {
        seen = sessionStorage.getItem(BOOT_SEQUENCE_SEEN_KEY) === "1";
      } catch {
        // Armazenamento bloqueado: trata como já visto. Repetir a animação a
        // cada navegação é pior do que nunca mostrá-la.
      }
      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      if (seen || reduced) {
        onDone();
        return;
      }
      try {
        sessionStorage.setItem(BOOT_SEQUENCE_SEEN_KEY, "1");
      } catch {
        // Sem persistência a sequência repetiria; exibir uma vez ainda é o certo.
      }
      setVisible(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [onDone]);

  useEffect(() => {
    if (!visible) return;

    function finish() {
      if (doneRef.current) return;
      doneRef.current = true;
      setVisible(false);
      onDone();
    }

    const timers: number[] = [];
    LINES.forEach((_, index) => {
      timers.push(window.setTimeout(() => setShown(index + 1), (index + 1) * LINE_MS));
    });
    timers.push(window.setTimeout(finish, LINES.length * LINE_MS + TAIL_MS));

    window.addEventListener("keydown", finish);
    window.addEventListener("pointerdown", finish);
    return () => {
      for (const timer of timers) window.clearTimeout(timer);
      window.removeEventListener("keydown", finish);
      window.removeEventListener("pointerdown", finish);
    };
  }, [visible, onDone]);

  if (!visible) return null;

  return (
    <div
      // `aria-hidden`: o formulário atrás já está montado e é o que um leitor de
      // tela deve encontrar. Anunciar "Banco de questões OK" seria ruído entre o
      // usuário e o campo de login.
      aria-hidden="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-paper"
    >
      <div className="w-[min(26rem,calc(100vw-3rem))] border border-edge bg-surface p-6 shadow-overlay">
        <p className="text-micro font-semibold uppercase tracking-[0.16em] text-primary">
          KROS · autoteste
        </p>

        <ul className="mt-4 flex flex-col gap-1.5">
          {LINES.map((line, index) => (
            <li
              key={line.label}
              className="flex items-baseline gap-3 text-xs"
              style={{ opacity: index < shown ? 1 : 0 }}
            >
              <span className="text-ink">{line.label}</span>
              {/* Régua de sumário em CSS, nunca em caractere: um leitor de tela
                  leria uma fileira de pontos como pontuação. */}
              <span className="chrome-leader" />
              <span className="font-semibold text-success">{line.status}</span>
            </li>
          ))}
        </ul>

        <p className="mt-5 text-nano font-semibold uppercase tracking-[0.14em] text-muted">
          Toque para continuar
        </p>
      </div>
    </div>
  );
}
