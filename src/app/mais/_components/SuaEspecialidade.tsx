"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Sheet } from "@/components/ui/Sheet";
import { salvarPerfilDeclarado } from "@/lib/api/domains/cadastro";
import { queryKeys } from "@/lib/queryKeys";
import { useAuthToken } from "@/lib/useAuthToken";
import catalogo from "@/data/especialidades.json";

/**
 * A especialidade que o médico pretende cursar.
 *
 * ## O campo já existia, e estava órfão
 *
 * `user_profiles.intended_specialty` é gravável desde o cadastro,
 * `salvarPerfilDeclarado` está escrito em `lib/api/domains/cadastro.ts` — e
 * **nenhuma tela chamava**. O contrato nem devolvia o campo de volta, então
 * mesmo quem o gravasse por curl não teria como vê-lo. Escrever sem ler é a
 * forma mais silenciosa de um campo morrer.
 *
 * ## Por que a lista é o CFM inteiro
 *
 * As 55 especialidades reconhecidas pela Resolução CFM nº 2.380/2024. Não é a
 * lista do que a Fácies tem questão, nem a das que "mais caem": limitar a
 * escolha ao acervo faria o produto decidir a carreira do médico pela sua
 * própria cobertura.
 *
 * ⚠️ O arquivo é GERADO do anexo da resolução, não transcrito — ver
 * `tests/unit/especialidades.test.mjs`, que trava a contagem e a fonte.
 *
 * ## O aviso, e por que ele vem ANTES
 *
 * O `TargetExamSelector` já estabeleceu o padrão, e o comentário dele diz por
 * quê: o aviso aparece *antes* de adicionar, porque "aqui é onde a escolha
 * acontece, e o custo de descobrir tarde é um plano inteiro montado para uma
 * prova que não vai acontecer".
 *
 * A Fácies **não verifica vaga**. Nenhum dado do produto sabe quais programas
 * uma instituição abre em cada ano — `facies.json` traz distribuição de prova,
 * não oferta de vaga. Dizer isso é a diferença entre declarar e prometer, e o
 * produto vende medida, não esperança.
 */

type Especialidade = { codigo: string; nome: string };

const ESPECIALIDADES: Especialidade[] = catalogo.especialidades;

/** Sem acento e sem caixa, para "obstetricia" achar "Obstetrícia". */
function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function SuaEspecialidade({ atual }: { atual: string | null }) {
  const { token } = useAuthToken();
  const queryClient = useQueryClient();
  const [aberta, setAberta] = useState(false);
  const [busca, setBusca] = useState("");

  const gravar = useMutation({
    mutationFn: (nome: string) => salvarPerfilDeclarado({ intended_specialty: nome }, token),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.perfil });
      setAberta(false);
      setBusca("");
    },
  });

  const filtradas = useMemo(() => {
    const termo = normalizar(busca.trim());
    if (!termo) return ESPECIALIDADES;
    return ESPECIALIDADES.filter((item) => normalizar(item.nome).includes(termo));
  }, [busca]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        className="paper-control flex min-h-12 w-full items-center justify-between gap-3 border-b border-rule py-3 text-left text-sm text-ink hover:text-primary"
      >
        <span className="min-w-0">
          A especialidade que você quer
          <span className="mt-0.5 block text-nota text-muted">
            {atual ?? "Ainda não declarada"}
          </span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-muted">
          ›
        </span>
      </button>

      <Sheet
        open={aberta}
        onClose={() => setAberta(false)}
        eyebrow="o seu objetivo"
        title="A especialidade que você quer"
      >
        {/* ⚠️ O AVISO VEM ANTES DA LISTA, e não depois da escolha.
            Mesmo lugar em que o `TargetExamSelector` põe o dele: quem descobre
            tarde já montou um plano inteiro para o lugar errado. */}
        <p className="rounded-surface border border-edge bg-surface p-3 text-nota leading-6 text-muted">
          <strong className="font-semibold text-ink">Confira o edital.</strong> A instituição
          decide quais vagas abre em cada ano, e a Fácies não verifica vagas: escolher aqui não
          confirma que a especialidade existe na sua prova-alvo. Essa conferência é sua.
        </p>

        <label className="mt-4 block">
          <span className="paper-eyebrow">procurar</span>
          <input
            type="search"
            value={busca}
            onChange={(evento) => setBusca(evento.target.value)}
            placeholder="oftalmo, clínica…"
            className="mt-1 min-h-11 w-full rounded-control border border-edge bg-paper px-3 text-sm text-ink placeholder:text-muted"
          />
        </label>

        <p className="mt-3 font-mono text-micro tabular-nums text-muted">
          {filtradas.length} de {ESPECIALIDADES.length}
        </p>

        {gravar.isError ? (
          <p className="mt-2 text-nota text-danger" role="alert">
            Não foi possível guardar. Tente novamente.
          </p>
        ) : null}

        <ul className="mt-2">
          {filtradas.map((item) => {
            const escolhida = item.nome === atual;
            return (
              <li key={item.codigo}>
                <button
                  type="button"
                  disabled={gravar.isPending}
                  onClick={() => gravar.mutate(item.nome)}
                  aria-pressed={escolhida}
                  className={`paper-control flex min-h-11 w-full items-center justify-between gap-3 border-b border-rule px-1 text-left text-sm disabled:opacity-50 ${
                    escolhida ? "font-semibold text-primary" : "text-ink hover:text-primary"
                  }`}
                >
                  {item.nome}
                  {escolhida ? <span aria-hidden="true">✓</span> : null}
                </button>
              </li>
            );
          })}
        </ul>

        {filtradas.length === 0 ? (
          <p className="mt-3 text-sm text-muted">
            Nenhuma das {ESPECIALIDADES.length} especialidades reconhecidas casa com isso.
          </p>
        ) : null}

        {/* A procedência da lista fica na tela, e não só no código: ela é o que
            separa "as 55 do CFM" de "as que escolhemos mostrar". */}
        <p className="mt-4 border-t border-rule pt-3 text-micro text-muted">
          {catalogo.fonte}
        </p>
      </Sheet>
    </>
  );
}
