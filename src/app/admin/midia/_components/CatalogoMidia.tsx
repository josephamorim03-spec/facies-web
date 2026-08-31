"use client";

import { useState } from "react";

/**
 * O catálogo, no navegador — busca e download.
 *
 * Recebe a lista já pronta do server component (`page.tsx`). Não importa
 * `lib/midia` aqui de propósito: isso arrastaria o dataset de 600 KB para o
 * bundle do cliente.
 */

export type ItemCatalogo = {
  pecaId: string;
  pecaRotulo: string;
  assuntoTipo: "prova" | "banca";
  slug: string;
  sigla: string;
  caminhoPublico: string;
  formatos: { id: string; rotulo: string; caminho: string }[];
};

function nomeDoArquivo(item: ItemCatalogo, formatoId: string): string {
  return `facies-${item.pecaId}-${item.slug}-${formatoId}.png`;
}

/**
 * Miniatura com estado de falha.
 *
 * `/midia/...` fica atrás de login: se a sessão do admin expirou, a rota devolve
 * redirect para `/login` e o `<img>` falha ao decodificar HTML. Sem isto o
 * catálogo mostraria uma imagem quebrada em vez de dizer o que fazer.
 */
function Miniatura({ src, alt }: { src: string; alt: string }) {
  const [falhou, setFalhou] = useState(false);
  if (falhou) {
    return (
      <div className="flex aspect-square w-full items-center justify-center border border-edge bg-paper px-3 text-center text-xs text-muted">
        miniatura indisponível — abra um formato para conferir
      </div>
    );
  }
  return (
    // A rota /midia devolve o PNG; `next/image` não soma nada aqui.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFalhou(true)}
      className="aspect-square w-full border border-edge bg-paper object-cover"
    />
  );
}

export function CatalogoMidia({ itens }: { itens: ItemCatalogo[] }) {
  const [busca, setBusca] = useState("");
  const filtro = busca.trim().toLowerCase();
  const visiveis = filtro
    ? itens.filter(
        (item) =>
          item.sigla.toLowerCase().includes(filtro) ||
          item.slug.toLowerCase().includes(filtro),
      )
    : itens;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-ink">Mídia</h1>
        <p className="mt-1 max-w-[64ch] text-sm text-muted">
          As peças geráveis da central. Escolha a prova, abra o formato e baixe — post
          pronto em cinco minutos. O que cada peça mostra é a mesma fácies da página
          pública, refluída nos formatos do Instagram.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[16rem]">
          <label htmlFor="busca" className="paper-eyebrow block pb-1">
            Buscar prova ou banca
          </label>
          <input
            id="busca"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="ex.: enamed, usp-sp"
            spellCheck={false}
            autoComplete="off"
            className="paper-control w-full rounded-control border border-edge bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted"
          />
        </div>
        <p className="paper-eyebrow text-muted">
          {visiveis.length} de {itens.length} peças
        </p>
      </div>

      {visiveis.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma peça com esse nome. Tente outro termo.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visiveis.map((item) => {
            const miniatura = item.formatos.find((f) => f.id === "feed")?.caminho ?? item.formatos[0]?.caminho;
            return (
              <div key={`${item.pecaId}-${item.slug}`} className="border border-edge bg-surface">
                <div className="flex items-start justify-between gap-2 px-4 pt-4">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-base font-semibold text-ink">{item.sigla}</p>
                    <p className="paper-eyebrow mt-0.5 text-muted">
                      {item.assuntoTipo === "prova" ? "prova" : "banca"} · {item.pecaRotulo}
                    </p>
                  </div>
                  <a
                    href={item.caminhoPublico}
                    target="_blank"
                    rel="noopener"
                    className="shrink-0 text-xs font-medium text-primary underline underline-offset-4"
                  >
                    página
                  </a>
                </div>

                {miniatura ? (
                  <a href={miniatura} target="_blank" rel="noopener" className="block px-4 py-3">
                    <Miniatura
                      src={miniatura}
                      alt={`Peça ${item.pecaRotulo} para ${item.sigla}`}
                    />
                  </a>
                ) : null}

                <div className="flex gap-1.5 px-4 pb-4">
                  {item.formatos.map((formato) => (
                    <a
                      key={formato.id}
                      href={formato.caminho}
                      download={nomeDoArquivo(item, formato.id)}
                      className="paper-control flex-1 rounded-control border border-edge bg-surface px-2 py-1.5 text-center text-xs font-medium text-ink hover:bg-surfaceMuted"
                    >
                      {formato.rotulo}
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
