"use client";

import { useState } from "react";

import { registrarEvento } from "@/lib/faciesFunnel";

/**
 * Copia o print da fácies — a unidade viral do §12.3.
 *
 * "Se o print vai circular de qualquer jeito, produza você o print, com
 * atribuição." A imagem buscada aqui é o MESMO arquivo que o WhatsApp mostra
 * quando alguém cola o link (`opengraph-image`), então as duas rotas de
 * compartilhamento entregam bytes idênticos. Renderizar de novo no cliente
 * criaria uma segunda verdade que divergiria na primeira mudança de layout.
 *
 * Três caminhos, do melhor para o que sempre funciona:
 *   1. área de transferência, que é onde o print realmente vai;
 *   2. compartilhamento nativo, no celular;
 *   3. download, que funciona em todo navegador.
 *
 * `ClipboardItem` com `image/png` não existe em todo lugar e exige gesto do
 * usuário; por isso a queda é silenciosa para o usuário e explícita no código.
 */

type Estado = "pronto" | "copiando" | "copiado" | "baixado";

export function CopiarImagem({
  imagem,
  nome,
}: {
  /** Caminho COMPLETO da imagem. Não um slug: derivar a URL de slug mais
   *  prefixo fixo fez a página de prova buscar a rota de banca, que aceita
   *  qualquer slug e devolvia o cartão genérico com HTTP 200. */
  imagem: string;
  nome: string;
}) {
  const [estado, setEstado] = useState<Estado>("pronto");

  async function copiar() {
    setEstado("copiando");
    // Disparado na INTENCAO, nao no sucesso: o §10 pergunta se o print circula,
    // e a pessoa que caiu no fallback de download compartilhou do mesmo jeito.
    registrarEvento("facies_copiada", nomeDoArquivo(imagem));
    try {
      const resposta = await fetch(imagem);
      if (!resposta.ok) throw new Error(`imagem indisponível (${resposta.status})`);
      const blob = await resposta.blob();
      const arquivo = new File([blob], `${nomeDoArquivo(imagem)}.png`, {
        type: "image/png",
      });

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setEstado("copiado");
        return;
      }

      if (navigator.canShare?.({ files: [arquivo] })) {
        await navigator.share({ files: [arquivo], title: `A fácies da ${nome}` });
        setEstado("copiado");
        return;
      }

      baixar(blob, `${nomeDoArquivo(imagem)}.png`);
      setEstado("baixado");
    } catch {
      // Última linha: se nem o fetch funcionou, abre a imagem numa aba para a
      // pessoa salvar à mão. Nunca deixa o botão morto sem explicação.
      window.open(imagem, "_blank", "noopener");
      setEstado("pronto");
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      disabled={estado === "copiando"}
      className="paper-control rounded-control border border-edge bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surfaceMuted disabled:opacity-60"
    >
      {estado === "copiando"
        ? "Preparando…"
        : estado === "copiado"
          ? "Imagem copiada"
          : estado === "baixado"
            ? "Imagem salva"
            : "Copiar imagem"}
    </button>
  );
}

/** `facies-enamed` a partir de `/prova/enamed/opengraph-image`. */
function nomeDoArquivo(caminho: string): string {
  const partes = caminho.split('/').filter(Boolean);
  return `facies-${partes[partes.length - 2] ?? 'prova'}`;
}

function baixar(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement("a");
  ancora.href = url;
  ancora.download = nomeArquivo;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(url);
}
