"use client";

import { useId, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { listQuestionBankBoards } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { queryKeys } from "@/lib/queryKeys";
import { Input } from "@/components/ui/Input";

// Escolha da banca-alvo, ancorada nas bancas que o banco REALMENTE tem.
//
// Antes isto era um `<input>` de texto livre. O problema nao era conveniencia:
// `_board_weights_from_priority` (question_bank_ranking) so aplica a distribuicao
// 80/20 por banca prioritaria quando o codigo digitado existe no pool de questoes
// -- caso contrario devolve `None` e a personalizacao por banca some, sem erro e
// sem aviso. Digitar "USP-SP" em vez de "USP" desligava a adaptabilidade em
// silencio.
//
// Continua aceitando texto livre de proposito: quem mira uma banca que ainda nao
// ingerimos nao pode ficar bloqueado. Mas a divergencia agora e' DITA.

type Props = {
  value: string;
  onChange: (value: string) => void;
};

function formatCount(count: number): string {
  return count.toLocaleString("pt-BR");
}

export function BoardPicker({ value, onChange }: Props) {
  const listId = useId();

  const { data: boards, isError } = useQuery({
    queryKey: queryKeys.questionBankBoards,
    queryFn: () => listQuestionBankBoards(getAuthToken()),
    staleTime: 30 * 60 * 1000,
  });

  const normalized = value.trim().toUpperCase();

  const match = useMemo(
    () => (boards ?? []).find((board) => board.board_code.toUpperCase() === normalized),
    [boards, normalized],
  );

  // Só cobra quando dá para cobrar: sem catálogo carregado, texto livre passa
  // sem ruído — o aviso seria sobre a nossa indisponibilidade, não sobre a
  // escolha do estudante.
  const catalogAvailable = Boolean(boards?.length) && !isError;
  const unknownBoard = catalogAvailable && normalized.length > 0 && !match;

  return (
    <>
      <Input
        label="Banca"
        placeholder="ENARE, USP, UNIFESP…"
        list={listId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="off"
        hint={
          match
            ? `${match.board_name} — ${formatCount(match.question_count)} questões no banco`
            : catalogAvailable
              ? "Comece a digitar para ver as bancas disponíveis."
              : undefined
        }
        error={
          unknownBoard
            ? "Ainda não temos questões desta banca. Você pode seguir assim, mas o peso por banca não vai se aplicar até ela entrar no banco."
            : undefined
        }
      />
      <datalist id={listId}>
        {(boards ?? []).map((board) => (
          <option key={board.board_code} value={board.board_code}>
            {board.board_name} ({formatCount(board.question_count)})
          </option>
        ))}
      </datalist>
    </>
  );
}
