import { NextResponse } from "next/server";

import { nomeCurto, todasAsBancas } from "@/lib/facies";
import type { BancaDoIndice } from "@/lib/facies";

/**
 * O ÍNDICE das bancas — nome e chave, sem a leitura de nenhuma delas.
 *
 * ## Por que uma segunda rota, e não a lista dentro de `/api/facies/banca/[key]`
 *
 * A aba "Comparar" precisa de duas coisas em momentos diferentes: a lista
 * inteira, para o aluno escolher contra quem comparar, e a fácies de UMA banca,
 * depois que ele escolheu. São volumes de ordem diferente.
 *
 * `facies.json` tem **1 MB** — medido, não estimado, e o comentário da rota
 * irmã ainda dizia 780 KB porque o número foi escrito quando era verdade e
 * ninguém remediu. Importar o dataset num componente cliente para tirar dele
 * 138 pares nome/chave mandaria o megabyte inteiro para o navegador.
 *
 * Este índice sai em **27,2 KB** — 27.819 bytes, medidos rodando este mesmo
 * `map` com o `nomeCurto` real sobre as 138, não estimados por amostragem. São
 * 37 vezes menos que o dataset, que é o ponto — este comentário já disse
 * "~12 KB", estimativa que nunca foi conferida e errava por mais que o dobro
 * (só os nomes de campo do JSON já custam 9 KB).
 *
 * A resposta é a mesma para todo mundo e não muda entre deploys, então ela é
 * estática de fato — daí o `force-static`, que faz o Next servir do build em
 * vez de recalcular por requisição.
 *
 * ⚠️ `nomeCurto` é a MESMA função dos chips da landing, e a repetição é o
 * ponto: se a lista daqui dissesse "SP - Universidade Estadual Paulista -
 * UNESP" e o chip dissesse "UNESP", o aluno teria dois vocabulários para a
 * mesma prova. `uf` viaja junto porque `nomeCurto` já resolve homônimos com
 * ela, e quando não resolve o nome longo é o desempate visível.
 *
 * Público como a rota irmã: é o mesmo dataset que a landing serve aberto. O que
 * é privado é a prova-alvo do aluno, e essa continua vindo do backend
 * autenticado.
 */
export const dynamic = "force-static";

export async function GET() {
  const bancas: BancaDoIndice[] = todasAsBancas()
    .map((banca) => ({
      institution_key: banca.institution_key,
      nome: nomeCurto(banca),
      nome_longo: banca.nome,
      uf: banca.uf,
      questoes_total: banca.questoes_total,
    }))
    // Ordem alfabética pelo nome CURTO, que é o que aparece na lista. Ordenar
    // pelo longo poria "SP - Universidade Estadual Paulista - UNESP" no S e
    // "UNESP" no U: a mesma prova em dois lugares dependendo de qual nome a
    // pessoa lembra.
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  return NextResponse.json(bancas, {
    headers: { "cache-control": "public, max-age=3600, stale-while-revalidate=86400" },
  });
}
