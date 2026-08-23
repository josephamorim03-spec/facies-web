"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Banca } from "@/lib/facies";
import { registrarEvento } from "@/lib/faciesFunnel";
import { Compartilhar } from "./Compartilhar";
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
export function FaciesPicker({
  bancas,
  onBancaChange,
}: {
  bancas: Banca[];
  /** Publica a banca ativa para quem monta a página posicionar o gate. */
  onBancaChange?: (banca: Banca) => void;
}) {
  const [ativa, setAtiva] = useState(0);
  const banca = bancas[ativa];
  const rotulos = rotularSemAmbiguidade(bancas);

  // Uma vez por visita, e nao a cada troca: `facies_vista` conta VISITA, e
  // dispara-lo na troca inflaria o denominador de toda taxa de conversao.
  useEffect(() => {
    registrarEvento("facies_vista");
  }, []);

  // Publica a banca ativa, inclusive a INICIAL: quem monta a pagina precisa
  // dela antes de qualquer clique, senao o gate no fim nasce sem destino.
  useEffect(() => {
    if (banca) onBancaChange?.(banca);
  }, [banca, onBancaChange]);

  if (!banca) return null;

  return (
    <div id="seletor" className="grid gap-4 scroll-mt-6">
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

      {/* Compartilhar fica junto do dado, nao no rodape: quem acabou de ler o
          numero e quem quer mandar para o grupo. O link vai para a PAGINA da
          banca, e nao para a home — quem recebe cai direto na leitura que o
          remetente estava vendo, e a previa do WhatsApp e a mesma imagem. */}
      <div className="flex flex-wrap items-center gap-3">
        <Compartilhar
          imagem={`/facies/${banca.slug}/opengraph-image`}
          url={`/facies/${banca.slug}`}
          nome={banca.nome}
        />
        <a
          href={`/facies/${banca.slug}`}
          className="text-sm text-primary underline underline-offset-4"
        >
          Abrir a página desta banca
        </a>
      </div>

      {/* O gate de e-mail SAIU daqui.
          Ele precisa da banca na tela — e' ele que diz para quem a leitura
          semanal deve ser escrita — e por isso morava dentro do picker. Só que
          isso o punha entre o relatório e a ponte, ou seja: no instante mais
          caro da página. Quem acaba de ver a fácies da própria prova está no
          pico de interesse, e a página gastava esse pico pedindo e-mail.

          Agora o picker publica qual banca está ativa (`onBancaChange`) e quem
          monta a página decide ONDE o gate entra. Na home ele entra no fim,
          como saída para quem não vai assinar hoje. */}
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
