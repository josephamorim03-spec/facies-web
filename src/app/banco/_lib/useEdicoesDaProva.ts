"use client";

/**
 * As edições da prova escolhida — e a pergunta "qual prova?" quando há duas.
 *
 * Vive fora de `page.tsx` porque é uma busca com ciclo de vida próprio (aborta,
 * tem estado de carga, falha em silêncio), e não estado de tela.
 *
 * **Só busca quando a resposta será lida**: fora do modo prova, ou sem banca e
 * ano escolhidos, não há seletor para alimentar. É a mesma regra da prévia do
 * Treino dirigido — chamada cujo resultado ninguém lê é trabalho pago à toa.
 *
 * **Falha para lista vazia, de propósito.** Sem edições o seletor "qual prova"
 * não aparece e a montagem segue como sempre seguiu. Um erro aqui não pode
 * impedir o aluno de começar a prova.
 *
 * ⚠️ O RESULTADO CARREGA O PEDIDO QUE O PRODUZIU, e daí sai tudo o mais.
 *
 * A primeira versão guardava a lista e um booleano de carga, e limpava a lista
 * no corpo do efeito quando o recorte saía de cena. Duas consequências, e o
 * `eslint` pegou a segunda: enquanto a busca da prova NOVA não voltasse, o
 * seletor mostrava as edições da prova ANTERIOR — e `setState` síncrono dentro
 * de efeito dispara renderização em cascata (`react-hooks/set-state-in-effect`).
 *
 * Comparar o pedido guardado com o pedido atual resolve os dois de uma vez:
 * "não bate" já significa "carregando", e nada precisa ser limpo.
 */

import { useEffect, useState } from "react";

import { listQuestionBankExamEditions, type QuestionBankExamEdition } from "@/lib/api";

import { useTotaisDaProva } from "./useTotaisDaProva.ts";

import {
  aplicacaoPorAno,
  chaveDaProva,
  tamanhoDaProva,
  tamanhoPorAno,
} from "./tamanhoDaProva";

export type ProvaEscolhida = { chave: string; rotulo: string; ano: number } | null;

type Resultado = {
  chave: string;
  grupo: string;
  linhas: QuestionBankExamEdition[];
};

export function useEdicoesDaProva(entrada: {
  token: string;
  ehModoProva: boolean;
  /** A chave da banca. Basta ela: o ano é escolhido DEPOIS, com estes dados. */
  bancaEscolhida: string;
  /** `RPLUS` ou `ACESSO-DIRETO`: R+ e acesso direto são cadernos diferentes. */
  accessGroup: string;
  /** O ano escolhido, para derivar o tamanho DAQUELA prova. */
  ano: number | null;
  /**
   * A prova escolhida dentro do ano, quando há mais de uma. Sem ela o tamanho
   * anunciado somaria os cadernos: no R+ do ENARE 2024 são sete, e o botão
   * prometeria 600 questões para uma sessão de 120.
   */
  escolha: string | null;
  /** `tokenResolved`: a auth já se resolveu. NÃO use `token` — ver abaixo. */
  pronto: boolean;
  /** Muda o tamanho: sem elas a prova encolhe pelas anuladas. */
  incluirAnuladas: boolean;
}): {
  edicoes: QuestionBankExamEdition[];
  carregando: boolean;
  /** Quantas questões a prova do ano escolhido vai ter. `null` = não sabemos. */
  tamanhoDoAno: number | null;
  /** Tamanho de cada ano, para o seletor de ano. `null` fora do modo prova. */
  tamanhoPorAnoDaProva: Map<number, number> | null;
  /** Tamanho de PROVA por banca, para o seletor de banca. */
  totaisDaProva: Map<string, number> | null;
  /** Quando a prova de cada ano caiu ("out/2025"). Ausente = sem evidência. */
  aplicacaoPorAnoDaProva: Map<number, string> | null;
} {
  const { token, pronto, ehModoProva, bancaEscolhida, accessGroup, ano, escolha, incluirAnuladas } =
    entrada;
  const [resultado, setResultado] = useState<Resultado | null>(null);
  // Composto aqui, e nao chamado ao lado na pagina: os dois respondem a
  // mesma pergunta -- "o que a PROVA tem" -- e um call site so mantem a
  // pagina como ligacao em vez de orquestracao.
  const totaisDaProva = useTotaisDaProva({ token, pronto, ehModoProva, accessGroup, incluirAnuladas });

  // ⚠️ O ANO NÃO ENTRA NA BUSCA, e a razão é o seletor de ano.
  //
  // Ele precisa dizer o tamanho de CADA ano ("2026 · 100") para o aluno
  // escolher qual prova fazer — e exigir o ano para buscar seria pedir a
  // resposta antes da pergunta. Uma banca traz ~48 linhas (6 anos × 8
  // cadernos), então buscar tudo de uma vez custa uma requisição a menos, não
  // uma a mais.
  const chave = bancaEscolhida;
  // ⚠️ `pronto` (o `tokenResolved` da página), e NUNCA `token`.
  //
  // `getAuthToken()` devolve string VAZIA de propósito: a sessão vive num
  // cookie httpOnly que o BFF lê e converte em `Authorization`. O token nunca
  // chega ao JavaScript — a função só existe para casar a assinatura de
  // `authHeader()`.
  //
  // Então `&& token` é um `return` incondicional, e foi o que este hook fez em
  // produção: medido no log da API em 2026-09-10, a tela pediu `availability`,
  // `topics` e `facets` para ENARE+2026 e NENHUMA vez `exam-editions`. O
  // seletor de ano continuava mostrando a contagem do treino porque o mapa da
  // prova nunca era buscado. A falha não lança: a tela fica idêntica e o
  // console limpo.
  //
  // Já custou quatro telas mortas nesta base (`token-no-cliente-e-sempre-vazio`).
  const ativo = Boolean(ehModoProva && chave && pronto);
  const combina = resultado?.chave === chave && resultado?.grupo === accessGroup;

  useEffect(() => {
    if (!ativo || combina) return;
    const controller = new AbortController();
    listQuestionBankExamEditions(
      token,
      { institution_key: chave, access_group: accessGroup },
      controller.signal,
    )
      .then((linhas) => setResultado({ chave, grupo: accessGroup, linhas }))
      .catch(() => {
        // Aborto não é falha: o pedido foi trocado, e gravar `[]` aqui faria o
        // recorte novo parecer "sem edições" em vez de "ainda carregando".
        if (controller.signal.aborted) return;
        setResultado({ chave, grupo: accessGroup, linhas: [] });
      });
    return () => controller.abort();
  }, [accessGroup, ativo, chave, combina, token]);

  const edicoes = ativo && combina && resultado ? resultado.linhas : [];
  const noAno = ano === null ? [] : edicoes.filter((e) => e.year === ano);
  // Sem escolha, o ano inteiro — que é o certo quando ele tem uma prova só.
  const doAno = escolha ? noAno.filter((e) => chaveDaProva(e) === escolha) : noAno;
  return {
    edicoes,
    carregando: ativo && !combina,
    tamanhoDoAno: tamanhoDaProva(doAno, incluirAnuladas),
    tamanhoPorAnoDaProva: ehModoProva ? tamanhoPorAno(edicoes, incluirAnuladas) : null,
    totaisDaProva,
    aplicacaoPorAnoDaProva: ehModoProva ? aplicacaoPorAno(edicoes) : null,
  };
}
