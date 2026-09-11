"use client";

import { useCallback, useEffect, useState } from "react";

import { previewKros, type KrosMode, type QuestionBankSessionCreatePayload } from "@/lib/api";

import {
  GRADE_PADRAO_DO_KROS,
  ajustarAoPassoDoKros,
  type GradeDoKros,
} from "./sessionBuilder";

/**
 * TUDO O QUE É DO TREINO DIRIGIDO, num sítio só.
 *
 * ## Por que virou hook
 *
 * A catraca de módulo (`scripts/check_architecture_invariants.py`) apanhou o
 * `banco/page.tsx` a passar de 1.038 para 1.110 linhas, e a regra dela é
 * explícita: *o teto só desce, extraia módulo em vez de subir o número*. A nota
 * do próprio invariante já nomeava os candidatos a hook — facetas, bootstrap,
 * montagem do payload. Este é o quarto, e nasceu inteiro na mesma mudança:
 * preset, bancas-alvo, grade de tamanho e a prévia que alimenta os três.
 *
 * Não é gaveta de sobras. O que junta estas peças é uma pergunta só — *como é
 * que o servidor quer esta sessão dirigida?* — e as três respostas vêm da MESMA
 * chamada (`POST /question-bank/kros/preview`).
 *
 * ## A grade vem do servidor, com um padrão local por baixo
 *
 * `KrosPreviewOut` publica `min_size`, `max_size` e `size_step` — a mesma regra
 * que `is_valid_kros_size` aplica para recusar com **422 `invalid_kros_size`**.
 * Ler daqui é melhor que confiar só na cópia de `sessionBuilder`: se o motor
 * mudar o piso, a barra acompanha sem esperar por um deploy do front.
 *
 * ⚠️ A cópia local CONTINUA, e não é redundância preguiçosa: a prévia é uma
 * chamada de rede que pode não ter respondido — ou ter falhado — no instante em
 * que o aluno prime "Começar". Sem o padrão local, esse instante voltaria a
 * mandar 10 e a receber 422, que é o defeito inteiro que esta rodada corrigiu.
 */

export type FiltrosDaPrevia = () => Partial<QuestionBankSessionCreatePayload>;

export type TreinoDirigido = {
  /** O preset escolhido. `equilibrado` é o `DEFAULT_KROS_MODE` do domínio. */
  modo: KrosMode;
  escolherModo: (modo: KrosMode) => void;
  /** Bancas-alvo do aluno, na ordem de prioridade. Vazio até a prévia responder. */
  bancasAlvo: string[];
  /** As declaradas que o pool não cobre. */
  bancasSemCobertura: string[];
  /** A prévia ainda não respondeu: o cartão da banca não pode afirmar nada. */
  previaCarregando: boolean;
  /** A grade de tamanho em vigor — a do servidor, ou o padrão local. */
  grade: GradeDoKros;
  /** Encosta um pedido na grade, dentro do teto do acervo. */
  ajustar: (valor: number, teto: number) => number;
};

export function useTreinoDirigido({
  ativo,
  token,
  tokenResolved,
  filtros,
}: {
  /** O modo está na tela. Fora dele, nada aqui faz chamada nenhuma. */
  ativo: boolean;
  token: string;
  tokenResolved: boolean;
  filtros: FiltrosDaPrevia;
}): TreinoDirigido {
  const [modo, escolherModo] = useState<KrosMode>("equilibrado");
  // `null` = a prévia ainda não respondeu. Distinto de "respondeu vazio", que
  // quer dizer que o aluno não declarou prova-alvo nenhuma.
  const [bancas, setBancas] = useState<{ alvo: string[]; semCobertura: string[] } | null>(null);
  const [gradeDoServidor, setGradeDoServidor] = useState<GradeDoKros | null>(null);

  /**
   * A prévia roda a pipeline INTEIRA no servidor, e por isso só é chamada com o
   * Treino dirigido na tela — pedi-la para quem escolheu "Por tópico" seria
   * pagar por um dado que ninguém vai ler.
   *
   * Sem ela, o cartão "Foco na banca" diria "Defina sua prova-alvo no perfil"
   * para TODO MUNDO, inclusive para quem já declarou — afirmação falsa dita a
   * quem menos merece ouvi-la.
   *
   * As dependências são só as que mudam a RESPOSTA: as bancas-alvo vêm do
   * perfil e a cobertura, do pool de candidatos, que é função dos filtros. O
   * preset e o tamanho ficam de fora de propósito — arrastar o slider
   * dispararia a pipeline inteira a cada tique para reler um dado que não
   * depende dele.
   */
  useEffect(() => {
    if (!ativo || !tokenResolved) return;
    const controller = new AbortController();
    previewKros(
      token,
      {
        session_kind: "kros",
        // Fixo, e não `modo`: esta chamada existe para ler as bancas, que são as
        // mesmas nos quatro presets. Passar o preset atual só criaria uma
        // dependência que não muda a resposta.
        kros_mode: "equilibrado",
        mode: "adaptive",
        resolution_mode: "simulation",
        ...filtros(),
      } as QuestionBankSessionCreatePayload,
      controller.signal,
    )
      .then((previa) => {
        setBancas({
          alvo: previa.target_boards,
          semCobertura: previa.unsatisfied_target_boards,
        });
        // Os três números vêm do MESMO objeto que `is_valid_kros_size`
        // parametriza. Guardados aqui, a barra passa a desenhar a grade que o
        // servidor de facto aceita, em vez da que o front supõe.
        if (
          Number.isFinite(previa.min_size) &&
          Number.isFinite(previa.max_size) &&
          Number.isFinite(previa.size_step) &&
          previa.size_step > 0
        ) {
          setGradeDoServidor({
            min: previa.min_size,
            max: previa.max_size,
            passo: previa.size_step,
          });
        }
      })
      .catch(() => {
        // Falha de prévia NÃO trava o seletor. Sem dado, o cartão da banca fica
        // em "carregando" e não afirma nada — melhor que afirmar o contrário.
      });
    return () => controller.abort();
  }, [ativo, tokenResolved, token, filtros]);

  const grade = gradeDoServidor ?? GRADE_PADRAO_DO_KROS;
  const ajustar = useCallback(
    (valor: number, teto: number) => ajustarAoPassoDoKros(valor, teto, grade),
    [grade],
  );

  return {
    modo,
    escolherModo,
    bancasAlvo: bancas?.alvo ?? [],
    bancasSemCobertura: bancas?.semCobertura ?? [],
    previaCarregando: ativo && bancas === null,
    grade,
    ajustar,
  };
}
