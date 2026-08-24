"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Banca } from "@/lib/facies";
import { nomeCurto, rotuloCurado } from "@/lib/facies";
import type { Prova } from "@/lib/provas";
import { registrarEvento } from "@/lib/faciesFunnel";
import { Compartilhar } from "./Compartilhar";
import { DestaqueProva } from "./DestaqueProva";
import { FaciesReport } from "./FaciesReport";
import { FaixaAreas } from "./FaixaAreas";

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
/** Índice sentinela da prova nacional, que não vive no array de bancas. */
const PROVA = -1;

export function FaciesPicker({
  bancas,
  prova,
  onChaveChange,
}: {
  bancas: Banca[];
  /** A prova nacional, se houver. Vira o primeiro chip e a seleção inicial. */
  prova?: Prova | null;
  /** Publica a chave ativa para quem monta a página posicionar o gate. */
  onChaveChange?: (chave: string | null) => void;
}) {
  // Abre na prova nacional quando ela existe: depois da convergência
  // regulatória é a prova de entrada da maioria, e abrir numa institucional
  // seria organizar a página pela estrutura do acervo em vez da pergunta de
  // quem chegou.
  const [ativa, setAtiva] = useState<number>(prova ? PROVA : 0);
  const banca = bancas[ativa === PROVA ? 0 : ativa];
  const rotulos = rotularSemAmbiguidade(bancas);

  // Uma vez por visita, e nao a cada troca: `facies_vista` conta VISITA, e
  // dispara-lo na troca inflaria o denominador de toda taxa de conversao.
  useEffect(() => {
    registrarEvento("facies_vista");
  }, []);

  // Publica a chave ativa, inclusive a INICIAL: quem monta a pagina precisa
  // dela antes de qualquer clique, senao o gate no fim nasce sem destino.
  // Com a prova no seletor a chave deixou de ser sempre uma instituicao — quem
  // salva o e-mail vendo o ENAMED quer noticia do ENAMED.
  const chave = ativa === PROVA ? (prova?.exam_key ?? null) : (banca?.institution_key ?? null);
  useEffect(() => {
    onChaveChange?.(chave);
  }, [chave, onChaveChange]);

  if (!banca && !prova) return null;

  const mostrandoProva = prova != null && ativa === PROVA;
  const alvo = mostrandoProva
    ? { imagem: `/prova/${prova.slug}/opengraph-image`, url: `/prova/${prova.slug}`, nome: prova.sigla, link: "Ver a fácies completa do " + prova.sigla }
    : { imagem: `/facies/${banca!.slug}/opengraph-image`, url: `/facies/${banca!.slug}`, nome: banca!.nome, link: "Ver a fácies completa da " + nomeCurto(banca!) };

  return (
    <div id="seletor" className="grid gap-4 scroll-mt-6">
      {/* CARTÃO, e não pílula — e a faixa colorida é a razão inteira.
          A fileira de pílulas dizia só o NOME, então a página afirmava que cada
          prova tem uma fácies e o seletor mostrava sete rótulos idênticos. Com
          a faixa, duas provas de perfil diferente ficam visivelmente diferentes
          ANTES de abrir qualquer uma — que é a tese da página acontecendo no
          primeiro olhar, e não depois de dois cliques.

          A largura de cada segmento é o peso da grande área. Ver FaixaAreas. */}
      <div
        className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4"
        role="group"
        aria-label="Escolha a prova"
      >
        {/* O ENAMED É O PRIMEIRO CHIP, e não mais um cartão separado acima.
            Ele e o seletor faziam a MESMA coisa — mostrar a fácies de uma prova
            — em duas superfícies diferentes, uma competindo com a outra, e o
            efeito era empurrar a isca para o terceiro lugar da página. Como
            chip, a prova que quase todo mundo presta abre a leitura já na
            primeira tela e as institucionais viram o caso particular que o
            §1.5 diz que elas são. */}
        {prova ? (
          <button
            type="button"
            aria-pressed={mostrandoProva}
            onClick={() => {
              setAtiva(PROVA);
              registrarEvento("destaque_clicado", prova.exam_key);
            }}
            className={`paper-control block rounded-surface border p-3 text-left transition ${
              mostrandoProva
                ? "border-primary bg-surfaceMuted"
                : "border-edge bg-surface hover:bg-surfaceMuted"
            }`}
          >
            <FaixaAreas linhas={prova.areas.linhas} />
            <span className="mt-3 flex flex-wrap items-baseline gap-x-2">
              <b className="text-sm font-semibold text-ink">{prova.sigla}</b>
              {mostrandoProva ? (
                <span className="paper-eyebrow text-primary">selecionada</span>
              ) : null}
            </span>
            <span className="mt-1 block font-mono text-micro text-muted">
              {prova.base.direta.questoes} questões ·{" "}
              {prova.profundidade.aplicacoes_na_serie} aplicações
            </span>
          </button>
        ) : null}
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
              className={`paper-control block rounded-surface border p-3 text-left transition ${
                selecionada
                  ? "border-primary bg-surfaceMuted"
                  : "border-edge bg-surface hover:bg-surfaceMuted"
              }`}
            >
              <FaixaAreas linhas={opcao.areas.linhas} />
              <span className="mt-3 flex flex-wrap items-baseline gap-x-2">
                <b className="text-sm font-semibold text-ink">{rotulo}</b>
                {selecionada ? (
                  <span className="paper-eyebrow text-primary">selecionada</span>
                ) : null}
              </span>
              <span className="mt-1 block font-mono text-micro text-muted">
                {opcao.total.toLocaleString("pt-BR")} questões · {opcao.primeiro_ano}–
                {opcao.ultimo_ano}
              </span>
            </button>
          );
        })}
        <Link
          href="/facies"
          className="paper-control flex items-center justify-center rounded-surface border border-dashed border-edge bg-surface p-3 text-sm text-muted transition hover:bg-surfaceMuted"
        >
          Ver as outras bancas
        </Link>
      </div>

      {/* UMA superfície, dois conteúdos — e NÃO um renderizador só.
          `Prova` e `Banca` parecem próximas e não são: `mais_cai` da prova é um
          score PONDERADO sobre uma série de aplicações, e o da banca é a
          contagem crua de questões. Espremer as duas no mesmo painel exibiria o
          score como se fosse `n`, que é exatamente a precisão fabricada que
          esta página recusa. Então o que se unifica é a superfície e o seletor;
          cada uma continua sendo lida pelo componente que entende os seus
          números. A leitura profunda do ENAMED segue em `/prova/[slug]`, para
          onde o link abaixo aponta. */}
      {mostrandoProva ? <DestaqueProva prova={prova} /> : <FaciesReport banca={banca!} />}

      {/* Compartilhar fica junto do dado, nao no rodape: quem acabou de ler o
          numero e quem quer mandar para o grupo. O link vai para a PAGINA da
          prova ou da banca, e nao para a home — quem recebe cai direto na
          leitura que o remetente estava vendo, e a previa do WhatsApp e a mesma
          imagem. */}
      {/* UM primario cheio, e o compartilhar como secundario ao lado.
          Antes os dois eram fracos: o compartilhar era um botao de borda e o
          "ver a facies completa" era LINK DE TEXTO sublinhado, no fim da linha.
          Nenhum dos dois pedia o clique, e a acao mais valiosa da pagina — abrir
          a leitura inteira da prova que a pessoa acabou de escolher — era a mais
          discreta das duas. */}
      <div className="flex flex-wrap items-center gap-3">
        <a
          href={alvo.url}
          onClick={() => registrarEvento("facies_pagina_aberta", chave)}
          className="paper-control inline-flex min-h-11 items-center rounded-control border border-primary bg-primary px-5 text-sm font-semibold text-primaryInk transition hover:border-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)]"
        >
          {alvo.link}
        </a>
        <Compartilhar imagem={alvo.imagem} url={alvo.url} nome={alvo.nome} />
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
  // O curado vence a heuristica. Ver `rotuloCurado` em lib/facies.ts.
  const brutos = bancas.map((banca) => rotuloCurado(banca.slug) ?? sigla(banca.nome));
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
