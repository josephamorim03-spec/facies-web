"use client";

import { useState } from "react";

import { Button } from "@/components/ui/Button";
import type { NavigationEnergy, NavigationPrompt } from "@/lib/api";

// "Fadigado/Normal/Focado" e nao "Baixa/Normal/Alta": o aluno descreve o proprio
// estado, nao gradua uma escala abstrata. Os tres continuam mapeando exatamente
// para low/normal/high do motor.
const ENERGY_OPTIONS: { value: NavigationEnergy; label: string }[] = [
  { value: "low", label: "Fadigado" },
  { value: "normal", label: "Normal" },
  { value: "high", label: "Focado" },
];

// Espelha `MIN_AVAILABLE_MINUTES`/`MAX_AVAILABLE_MINUTES` de
// `navigation_route.py` — a mesma faixa que `NavigationRouteIn` valida. Tê-la
// aqui é o que troca um 422 do servidor por uma frase legível antes do clique.
const MIN_MINUTES = 5;
const MAX_MINUTES = 480;

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
 *
 * Ainda assim preset é atalho, não o conjunto das respostas possíveis: a rotina
 * descreve o dia típico, e hoje o aluno pode ter exatamente 35 minutos entre um
 * plantão e outro. Por isso o campo livre convive com os atalhos e tem
 * precedência sobre eles — digitar é dizer que nenhum atalho servia.
 */
export function RotaPrompt({ prompt, busy = false, onCalculate }: Props) {
  // O estado local guarda apenas o OVERRIDE do aluno. O valor sugerido é
  // derivado do prompt no render, e não copiado para o estado por efeito:
  // copiar criaria uma segunda fonte da mesma verdade, que fica velha quando o
  // prompt chega depois — exatamente o caso aqui, já que ele vem de uma query.
  const [minutes, setMinutes] = useState<number | null>(null);
  // Texto cru, não número: guardar já convertido apagaria a diferença entre
  // "vazio" e "inválido", e o aluno perderia no meio da digitação o que digitou.
  const [typedMinutes, setTypedMinutes] = useState("");
  const [energy, setEnergy] = useState<NavigationEnergy | null>(null);
  const [interruption, setInterruption] = useState<boolean | null>(null);

  // Degradar, nunca derrubar. `/hoje` e' a tela principal do produto: se o
  // prompt vier parcial ou com outra forma, o certo e' o cartao sumir e o resto
  // do dia continuar de pe. Sem esta guarda, `presets.map` de um payload
  // inesperado estourava o error boundary e o aluno perdia a pagina inteira —
  // aconteceu de verdade, num spec que nao mockava este endpoint.
  const presets = Array.isArray(prompt?.presets) ? prompt.presets : [];
  if (!prompt || presets.length === 0) return null;

  // O campo livre vence o preset: havendo número digitado, ele é a última coisa
  // que o aluno disse. Fora da faixa não vira valor — vira aviso e trava o
  // botão, em vez de virar 422 depois do clique.
  const rawMinutes = typedMinutes.trim();
  const parsedMinutes = rawMinutes === "" ? null : Number.parseInt(rawMinutes, 10);
  const invalidMinutes =
    parsedMinutes !== null &&
    (!Number.isFinite(parsedMinutes) ||
      parsedMinutes < MIN_MINUTES ||
      parsedMinutes > MAX_MINUTES);
  const selectedMinutes =
    parsedMinutes !== null && !invalidMinutes
      ? parsedMinutes
      : (minutes ?? prompt.suggested_minutes ?? presets[0]);
  // Com número inválido no campo, nenhum atalho aparece marcado: marcar um
  // seria dizer que ele vale, e neste estado nada vale — o botão está travado.
  // `selectedMinutes` continua tendo valor só para o caso de o campo ser limpo.
  const pressedMinutes = invalidMinutes ? null : selectedMinutes;
  const selectedEnergy = energy ?? prompt.suggested_energy ?? "normal";
  const riskActive = interruption ?? Boolean(prompt.interruption_risk);

  return (
    <section
      aria-labelledby="navigator-context-title"
      className="border-b border-edge pb-4"
    >
      {/* O <h1> nasce aqui e nao na pagina porque os dois passos da rota
          (prompt e resultado) tem titulos diferentes, e o do resultado ja mora
          no próprio ramo. Um <h1> comum na página daria dois <h1> vivos no
          passo de resultado. */}
      <h1 className="font-serif text-2xl font-semibold leading-tight text-ink">
        Rota de hoje
      </h1>

      <h2
        id="navigator-context-title"
        className="mt-4 font-serif text-xl font-semibold text-ink"
      >
        Quanto tempo você tem?
      </h2>

      <div
        className="mt-3 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Tempo disponível"
      >
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            aria-pressed={pressedMinutes === preset}
            disabled={busy}
            onClick={() => {
              setMinutes(preset);
              // Limpar o campo é obrigatório: ele tem precedência, então um
              // número esquecido lá dentro venceria o atalho recém-tocado.
              setTypedMinutes("");
            }}
            className={`min-h-10 border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
              pressedMinutes === preset
                ? "border-primary bg-surfaceMuted text-ink"
                : "border-edge bg-paper text-muted enabled:hover:bg-surfaceMuted"
            }`}
          >
            {preset} min
          </button>
        ))}

        <span className="flex items-center gap-2">
          <input
            id="rota-minutos"
            type="number"
            inputMode="numeric"
            min={MIN_MINUTES}
            max={MAX_MINUTES}
            value={typedMinutes}
            disabled={busy}
            onChange={(event) => setTypedMinutes(event.target.value)}
            placeholder="Outro"
            aria-label="Outro tempo, em minutos"
            aria-invalid={invalidMinutes || undefined}
            aria-describedby={invalidMinutes ? "rota-minutos-erro" : undefined}
            className={`min-h-10 w-24 border bg-paper px-3 text-sm font-semibold tabular-nums text-ink transition-colors placeholder:font-normal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-60 ${
              invalidMinutes ? "border-warning" : "border-edge focus:border-primary"
            }`}
          />
          <span className="text-sm text-muted">min</span>
        </span>
      </div>

      {invalidMinutes ? (
        <p id="rota-minutos-erro" className="mt-2 text-sm font-semibold text-warning">
          Diga um tempo entre {MIN_MINUTES} e {MAX_MINUTES} minutos.
        </p>
      ) : (
        <p className="mt-2 text-xs text-muted">
          Toque num tempo ou digite o seu, de {MIN_MINUTES} a {MAX_MINUTES} min.
        </p>
      )}

      <h3 className="mt-5 text-sm font-semibold text-ink">Como está sua energia?</h3>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Energia">
        {ENERGY_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={selectedEnergy === option.value}
            disabled={busy}
            onClick={() => setEnergy(option.value)}
            className={`min-h-10 border px-4 text-sm font-semibold transition-colors disabled:opacity-60 ${
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
          // Sem isto o `Button` cai em `secondary`: a acao principal da tela
          // ficava neutra enquanto a do banco vinha em azul.
          variant="primary"
          size="md"
          disabled={busy || invalidMinutes}
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
