"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { NavigationEnergy, NavigationPrompt } from "@/lib/api";

const ENERGY_OPTIONS: { value: NavigationEnergy; label: string }[] = [
  { value: "low", label: "Baixa" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Alta" },
];

type Props = {
  prompt: NavigationPrompt | null;
  busy?: boolean;
  onCalculate: (input: {
    availableMinutes: number;
    energy: NavigationEnergy;
    interruptionOverride: boolean | null;
  }) => void;
};

/**
 * A pergunta do Navigator: quanto tempo e como está a energia AGORA.
 *
 * Os dois são sempre perguntados, mesmo com a rotina já declarada — rotina é o
 * que o aluno costuma ter, não o que ele tem neste momento. O que a rotina faz
 * é tornar a resposta barata: os presets saem da capacidade estimada do dia (e
 * não de uma lista fixa), e a energia já chega pré-selecionada pelo check-in.
 */
export function NavigatorContextCard({ prompt, busy = false, onCalculate }: Props) {
  // O estado local guarda apenas o OVERRIDE do aluno. O valor sugerido é
  // derivado do prompt no render, e não copiado para o estado por efeito:
  // copiar criaria uma segunda fonte da mesma verdade, que fica velha quando o
  // prompt chega depois — exatamente o caso aqui, já que ele vem de uma query.
  const [minutes, setMinutes] = useState<number | null>(null);
  const [energy, setEnergy] = useState<NavigationEnergy | null>(null);
  const [interruption, setInterruption] = useState<boolean | null>(null);

  // Degradar, nunca derrubar. `/hoje` e' a tela principal do produto: se o
  // prompt vier parcial ou com outra forma, o certo e' o cartao sumir e o resto
  // do dia continuar de pe. Sem esta guarda, `presets.map` de um payload
  // inesperado estourava o error boundary e o aluno perdia a pagina inteira —
  // aconteceu de verdade, num spec que nao mockava este endpoint.
  const presets = Array.isArray(prompt?.presets) ? prompt.presets : [];
  if (!prompt || presets.length === 0) return null;

  const selectedMinutes = minutes ?? prompt.suggested_minutes ?? presets[0];
  const selectedEnergy = energy ?? prompt.suggested_energy ?? "normal";
  const riskActive = interruption ?? Boolean(prompt.interruption_risk);

  return (
    <section
      aria-labelledby="navigator-context-title"
      className="border-y border-edge py-4"
    >
      <h2
        id="navigator-context-title"
        className="font-serif text-xl font-semibold text-ink"
      >
        Quanto tempo você tem?
      </h2>

      <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label="Tempo disponível">
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={selectedMinutes === preset}
            disabled={busy}
            onClick={() => setMinutes(preset)}
            className={`min-h-10 rounded-control border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
              selectedMinutes === preset
                ? "border-primary bg-surfaceMuted text-ink"
                : "border-edge bg-paper text-muted enabled:hover:bg-surfaceMuted"
            }`}
          >
            {preset} min
          </button>
        ))}
      </div>

      <h3 className="mt-5 text-sm font-semibold text-ink">Como está sua energia?</h3>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Energia">
        {ENERGY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={selectedEnergy === option.value}
            disabled={busy}
            onClick={() => setEnergy(option.value)}
            className={`min-h-10 rounded-control border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
              selectedEnergy === option.value
                ? "border-primary bg-surfaceMuted text-ink"
                : "border-edge bg-paper text-muted enabled:hover:bg-surfaceMuted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
      {prompt.energy_source === "assumed" ? (
        // Dizer que é palpite importa: afirmar "você disse normal" quando o
        // aluno não disse nada é inventar uma declaração.
        <p className="mt-2 text-xs text-muted">
          Assumimos normal. Toque para corrigir.
        </p>
      ) : null}

      {riskActive ? (
        <p className="mt-4 text-sm leading-6 text-muted">
          Você marcou plantão: priorizamos o que aguenta interrupção.{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => setInterruption(false)}
            className="font-semibold text-primary underline disabled:opacity-60"
          >
            Hoje não vou ser interrompido
          </button>
        </p>
      ) : null}

      <div className="mt-5">
        <Button
          type="button"
          disabled={busy}
          onClick={() =>
            onCalculate({
              availableMinutes: selectedMinutes,
              energy: selectedEnergy,
              interruptionOverride: interruption,
            })
          }
        >
          {busy ? "Calculando rota…" : "Calcular rota"}
        </Button>
      </div>
    </section>
  );
}
