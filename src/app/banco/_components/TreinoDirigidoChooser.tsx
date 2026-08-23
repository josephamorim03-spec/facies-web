"use client";

import type { KrosMode } from "@/lib/api";

type Opcao = {
  value: KrosMode;
  label: string;
  help: string;
};

/**
 * Os quatro presets de "Treino dirigido".
 *
 * ## Por que este componente voltou
 *
 * Ele existia em `/rota/_components/KrosModeChooser.tsx` e morreu quando o
 * `/rota` foi deletado — junto com o único lugar do frontend que enviava
 * `session_kind: "kros"`. A decisão de matar o `/rota` estava certa no que ela
 * mirava (a pergunta de tempo e energia), mas levou junto uma coisa que **não
 * era pergunta sobre o estado do aluno**: um preset é intenção declarada ("hoje
 * quero bater nos meus erros"), e intenção não se infere de comportamento.
 *
 * O que se perdeu enquanto ele não existia, medido em `question_bank_service`:
 * `explicit_kros` é `session_kind == "kros" and "session_kind" in
 * model_fields_set`, então sem ninguém mandando `session_kind` as quotas caem no
 * fixo `(0.60, 0.30, 0.10)` e `max_answered` fica em **0** — o que torna
 * "Prioridade nos erros" impossível, já que o modo existe para reexpor o erro.
 *
 * E repare no detalhe que torna isso ainda mais quieto: aquele fixo é
 * numericamente idêntico às quotas de `equilibrado`. A sessão degradada não sai
 * quebrada nem vazia; sai *plausível*. Nenhum aluno teria como notar, e nenhum
 * gate notou.
 *
 * ## O vocabulário mora aqui; o comportamento, no domínio
 *
 * As quotas e os bônus vivem em `app/domain/kros_modes.py`. Aqui só mora a cópia
 * que o aluno lê — por isso as descrições falam de resultado ("questões que você
 * já errou"), não de quota.
 */
export const TREINO_DIRIGIDO_OPCOES: Opcao[] = [
  {
    value: "equilibrado",
    label: "Equilibrado",
    help: "A mistura padrão entre lacunas, alta incidência e conteúdo novo.",
  },
  {
    value: "prioridade_erros",
    label: "Prioridade nos erros",
    help: "Foca onde você mais erra. Até 40% podem ser questões que você já errou.",
  },
  {
    value: "terreno_novo",
    label: "Terreno novo",
    help: "Prioriza temas de alta incidência que você quase não viu.",
  },
  {
    value: "foco_banca",
    label: "Foco na banca",
    help: "Distribui conforme as suas provas-alvo.",
  },
];

/**
 * "Foco na banca" só tem o que priorizar se o aluno declarou prova-alvo.
 *
 * Sem objetivo declarado, a lista volta vazia e o modo não faz nada — oferecê-lo
 * assim seria repetir uma promessa vazia numa camada acima. Aqui ele se
 * desabilita e diz por quê.
 *
 * O segundo caso é o mais traiçoeiro e o motivo de `unsatisfied` existir: o aluno
 * declarou, e o banco não tem questão daquela banca. Antes isso era
 * indistinguível de sucesso — a prova saía igual à de quem não declarou nada, e
 * o motivo ficava só no log do servidor.
 */
function copyDaBanca(
  bancas: string[],
  semCobertura: string[],
): { help: string; indisponivel: boolean } {
  if (bancas.length === 0) {
    return {
      help: "Defina sua prova-alvo no perfil para liberar este modo.",
      indisponivel: true,
    };
  }
  const cobertas = bancas.filter((b) => !semCobertura.includes(b));
  if (cobertas.length === 0) {
    return {
      help: `Ainda não há questões de ${bancas.join(", ")} no banco.`,
      indisponivel: true,
    };
  }
  const [primeira, ...resto] = cobertas;
  const outras = resto.length > 0 ? ` (depois ${resto.join(", ")})` : "";
  const lacuna =
    semCobertura.length > 0 ? ` Sem questões de ${semCobertura.join(", ")} por enquanto.` : "";
  return { help: `Prioriza questões de ${primeira}${outras}.${lacuna}`, indisponivel: false };
}

type Props = {
  value: KrosMode;
  onChange: (mode: KrosMode) => void;
  disabled?: boolean;
  /** Bancas-alvo do aluno, na ordem de prioridade. Vem da prévia. */
  bancasAlvo?: string[];
  /** As declaradas que o pool não cobre. Vem da prévia. */
  bancasSemCobertura?: string[];
  /** A prévia ainda não respondeu: o cartão da banca não pode afirmar nada. */
  carregando?: boolean;
};

export function TreinoDirigidoChooser({
  value,
  onChange,
  disabled = false,
  bancasAlvo = [],
  bancasSemCobertura = [],
  carregando = false,
}: Props) {
  const banca = copyDaBanca(bancasAlvo, bancasSemCobertura);

  return (
    <div
      className="mt-3 grid gap-3 sm:grid-cols-2"
      role="radiogroup"
      aria-label="Como treinar"
    >
      {TREINO_DIRIGIDO_OPCOES.map((opcao) => {
        const ehBanca = opcao.value === "foco_banca";
        // Enquanto a prévia não respondeu, o cartão da banca não afirma nem
        // "defina sua prova-alvo" nem o contrário: dizer que ele não declarou
        // para quem declarou é a mesma promessa vazia com o sinal trocado.
        const indisponivel = ehBanca && !carregando && banca.indisponivel;
        const ativo = opcao.value === value;
        const help = ehBanca ? (carregando ? "Verificando as suas provas-alvo…" : banca.help) : opcao.help;
        return (
          <button
            key={opcao.value}
            type="button"
            role="radio"
            aria-checked={ativo}
            disabled={disabled || indisponivel}
            onClick={() => onChange(opcao.value)}
            className={`paper-control rounded-control border px-4 py-3 text-left disabled:opacity-60 ${
              ativo
                ? "border-primary bg-surfaceMuted"
                : "border-edge bg-paper enabled:hover:bg-surfaceMuted"
            }`}
          >
            <span className={`block text-sm font-semibold ${ativo ? "text-ink" : "text-muted"}`}>
              {opcao.label}
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted">{help}</span>
          </button>
        );
      })}
    </div>
  );
}
