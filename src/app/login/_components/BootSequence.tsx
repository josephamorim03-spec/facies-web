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
  { label: "Kros", status: "OK" },
];

/** Intervalo entre linhas. O total (~5×130ms) fica abaixo de 1s. */
const LINE_MS = 130;

/**
 * POST de boot — o ENQUADRAMENTO da tela de acesso, não uma abertura.
 *
 * Era um overlay `fixed inset-0` que cobria o formulário e sumia em menos de um
 * segundo. Isso desperdiçava a única coisa que a lista faz de útil: dizer o que
 * o sistema é, no momento em que a pessoa está parada olhando para ele. Um
 * cartão que aparece e some rápido demais para ser lido é decoração.
 *
 * Agora ela fica. O que anima é só a ENTRADA, uma vez por aba — nas visitas
 * seguintes as cinco linhas já nascem prontas, e o formulário nunca é coberto.
 *
 * Três travas mantidas do overlay:
 *
 * 1. **Uma vez por aba** (`sessionStorage`): abrir o app amanhã anima; voltar
 *    para a aba de login não.
 * 2. **`prefers-reduced-motion` manda** — uma lista que aparece linha a linha É
 *    movimento.
 * 3. **Menos de um segundo.** Se a marca precisa de mais, o problema não é a
 *    duração.
 *
 * `aria-hidden` porque isto é cenário: quem usa leitor de tela precisa chegar no
 * formulário, não ouvir "Banco de questões OK" cinco vezes antes dele.
 */
export function BootSequence() {
  const [shown, setShown] = useState<number | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    // A decisão depende de `sessionStorage` e `matchMedia`, que só existem no
    // cliente — então ela não pode virar estado inicial (o servidor renderizaria
    // diferente e a hidratação divergiria).
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
        setShown(LINES.length);
        return;
      }
      try {
        sessionStorage.setItem(BOOT_SEQUENCE_SEEN_KEY, "1");
      } catch {
        // Sem persistência a sequência repetiria; exibir uma vez ainda é o certo.
      }
      setShown(0);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (shown === null || shown >= LINES.length) return;
    const timer = window.setTimeout(() => setShown((n) => (n ?? 0) + 1), LINE_MS);
    return () => window.clearTimeout(timer);
  }, [shown]);

  // `null` é o quadro antes da decisão: as linhas já ocupam o espaço, invisíveis,
  // para o formulário abaixo não pular quando elas aparecerem.
  const visible = shown ?? LINES.length;

  return (
    <div aria-hidden="true" className="border-y border-ink py-3">
      <ul className="flex flex-col gap-1">
        {LINES.map((line, index) => (
          <li
            key={line.label}
            className="flex items-baseline gap-3 text-xs"
            style={{ opacity: shown === null ? 0 : index < visible ? 1 : 0 }}
          >
            <span className="text-ink">{line.label}</span>
            {/* Régua de sumário em CSS, nunca em caractere: um leitor de tela
                leria uma fileira de pontos como pontuação. */}
            <span className="chrome-leader" />
            <span className="shrink-0 font-semibold text-success">{line.status}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
