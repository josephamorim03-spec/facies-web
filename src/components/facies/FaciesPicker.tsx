"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Banca } from "@/lib/facies";
import { registrarEvento } from "@/lib/faciesFunnel";
import { CopiarImagem } from "./CopiarImagem";
import { GateEmail } from "./GateEmail";
import { FaciesReport } from "./FaciesReport";

/**
 * Seletor de banca da home.
 *
 * A home MOSTRA uma fácies, não oferece um botão para vê-la (§12.1): o visitante
 * chega por link colado em grupo, com intenção específica e paciência de
 * segundos. Não há hero decorativo com o produto três rolagens abaixo.
 *
 * A troca é local e sem ida ao servidor porque as bancas em destaque vêm todas
 * no primeiro carregamento. O dataset completo passa de 600 KB e ficaria caro
 * para quem abriu o link no corredor — as outras bancas têm página própria,
 * gerada estática.
 */
export function FaciesPicker({ bancas }: { bancas: Banca[] }) {
  const [ativa, setAtiva] = useState(0);
  const banca = bancas[ativa];
  const rotulos = rotularSemAmbiguidade(bancas);

  // Uma vez por visita, e nao a cada troca: `facies_vista` conta VISITA, e
  // dispara-lo na troca inflaria o denominador de toda taxa de conversao.
  useEffect(() => {
    registrarEvento("facies_vista");
  }, []);

  if (!banca) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Escolha a prova institucional">
        {bancas.map((opcao, indice) => {
          const selecionada = indice === ativa;
          const rotulo = rotulos[indice];
          return (
            <button
              key={opcao.slug}
              type="button"
              aria-pressed={selecionada}
              onClick={() => {
                setAtiva(indice);
                registrarEvento("facies_banca_trocada", opcao.institution_key);
              }}
              className={`paper-control rounded-control border px-3 py-2 text-sm transition ${
                selecionada
                  ? "border-primary bg-primary font-semibold text-primaryInk"
                  : "border-edge bg-surface text-ink hover:bg-surfaceMuted"
              }`}
            >
              {rotulo}
            </button>
          );
        })}
        <Link
          href="/facies"
          className="paper-control rounded-control border border-edge bg-surface px-3 py-2 text-sm text-muted hover:bg-surfaceMuted"
        >
          buscar outra
        </Link>
      </div>

      <FaciesReport banca={banca} />

      {/* O print e a unidade de compartilhamento: fica junto do dado, nao no
          rodape. Quem acabou de ler o numero e quem quer mandar para o grupo. */}
      <div className="flex flex-wrap items-center gap-3">
        <CopiarImagem
          imagem={`/facies/${banca.slug}/opengraph-image`}
          nome={banca.nome}
        />
        <a
          href={`/facies/${banca.slug}`}
          className="text-sm text-primary underline underline-offset-4"
        >
          Abrir a página desta banca
        </a>
      </div>

      {/* O gate vive AQUI, dentro do picker, porque precisa saber qual banca
          esta na tela: o e-mail sem a banca perde metade do valor -- e' ele que
          diz para quem a leitura semanal deve ser escrita. */}
      <GateEmail banca={banca.institution_key} />
    </div>
  );
}

/**
 * Rotula as bancas do seletor SEM deixar duas com o mesmo nome.
 *
 * A sigla sozinha colide: "SES DF" e "SES PE" viram ambas "SES", e o visitante
 * não tem como saber qual botão é qual. Quando duas colidem, a UF entra junto —
 * que é a desambiguação que o próprio edital usa e que não exige curadoria.
 */
function rotularSemAmbiguidade(bancas: Banca[]): string[] {
  const brutos = bancas.map((banca) => sigla(banca.nome));
  const contagem = new Map<string, number>();
  for (const bruto of brutos) contagem.set(bruto, (contagem.get(bruto) ?? 0) + 1);

  return brutos.map((bruto, indice) => {
    const uf = bancas[indice].uf;
    if ((contagem.get(bruto) ?? 0) > 1 && uf) return bruto + "-" + uf;
    return bruto;
  });
}

/**
 * Sigla legível a partir do rótulo do edital.
 *
 * O rótulo real é a string da instituição, longa de propósito: "SP - Universidade
 * de São Paulo - USP - SP (HC-FMUSP)". Curar sigla para 141 bancas é trabalho
 * editorial que ainda não foi feito, então aqui a regra é conservadora — pega o
 * trecho em caixa alta mais provável e cai no rótulo cortado quando não acha.
 * Melhor uma sigla imperfeita e visível que uma sigla inventada.
 */
function sigla(nome: string): string {
  const semUf = nome.replace(/^[A-Z]{2}\s*-\s*/, "");
  const candidatos = semUf.match(/\b[A-Z]{2,}(?:-[A-Z]{2,})?\b/g);
  if (candidatos && candidatos.length > 0) {
    return candidatos.sort((a, b) => b.length - a.length)[0];
  }
  return semUf.slice(0, 18);
}
