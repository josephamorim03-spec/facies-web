"use client";

import { useEffect, useState } from "react";
import { DropdownMenu } from "radix-ui";

import { registrarEvento } from "@/lib/faciesFunnel";

/**
 * Compartilha a fácies — a unidade viral do §12.3.
 *
 * ## O que mudou, e por que o link vale mais que o arquivo
 *
 * Este botão se chamava "Copiar imagem" e entregava o PNG. O nome descrevia o
 * mecanismo, não a ação, e a cascata tinha um defeito silencioso: o clipboard
 * vinha primeiro, e `ClipboardItem` existe no Chrome de Android — então a
 * bandeja nativa, que é o único caminho pelo qual o WhatsApp aparece no celular,
 * quase nunca disparava. O fallback estava na frente do caminho principal.
 *
 * Agora o link vem primeiro, e ele entrega MAIS que o arquivo: a prévia que o
 * WhatsApp renderiza é o mesmo `opengraph-image` que o botão baixava — bytes
 * idênticos, porque é a mesma rota. Só que o link é clicável e leva o crédito
 * junto, enquanto o PNG solto circula órfão. O `wa.me` não aceita anexo, e essa
 * limitação acabou empurrando para a opção melhor.
 *
 * Renderizar a imagem de novo no cliente continua fora de questão: criaria uma
 * segunda verdade, que divergiria na primeira mudança de layout.
 *
 * ## Três caminhos, do melhor para o que sempre funciona
 *
 *   1. bandeja nativa (`navigator.share`), no celular — é onde o WhatsApp está;
 *   2. no desktop, um menu com WhatsApp, copiar link e copiar imagem;
 *   3. a imagem cai para download quando `ClipboardItem` não existe, e para uma
 *      aba nova quando nem o `fetch` funciona. O botão nunca morre calado.
 */

type Estado = "pronto" | "copiando" | "copiado" | "baixado" | "link";

export function Compartilhar({
  imagem,
  url,
  nome,
}: {
  /** Caminho COMPLETO da imagem. Não um slug: derivar a URL de slug mais
   *  prefixo fixo fez a página de prova buscar a rota de banca, que aceita
   *  qualquer slug e devolvia o cartão genérico com HTTP 200. */
  imagem: string;
  /** Caminho da página que o link deve apontar — é ela que carrega a prévia. */
  url: string;
  nome: string;
}) {
  const [estado, setEstado] = useState<Estado>("pronto");

  /**
   * Só depois de montar, e nunca durante o render.
   *
   * `navigator` não existe no servidor, então lê-lo no corpo do componente daria
   * marcação divergente na hidratação. O primeiro quadro sai sempre com o menu
   * (que funciona em todo lugar) e o celular troca para a bandeja em seguida.
   */
  const [temBandeja, setTemBandeja] = useState(false);
  useEffect(() => {
    setTemBandeja(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  const chave = nomeDoArquivo(imagem);
  const texto = `A fácies da ${nome}`;

  /** Absoluta só no clique: no servidor não existe origem, e fixá-la em env
   *  daria um link errado em preview de deploy. */
  const absoluta = () => new URL(url, window.location.origin).toString();

  async function compartilhar() {
    registrarEvento("facies_compartilhada", chave);

    // A bandeja nativa é o caminho do celular, e `share` com URL tem suporte
    // muito mais largo que `share` com arquivo — que era o que o código antigo
    // tentava, e por isso a checagem `canShare` reprovava com frequência.
    try {
      await navigator.share({ title: texto, text: texto, url: absoluta() });
    } catch {
      /* cancelar o compartilhamento não é erro */
    }
  }

  function abrirWhatsApp() {
    registrarEvento("facies_compartilhada", chave);
    const mensagem = encodeURIComponent(`${texto} — ${absoluta()}`);
    window.open(`https://wa.me/?text=${mensagem}`, "_blank", "noopener,noreferrer");
  }

  async function copiarLink() {
    registrarEvento("facies_compartilhada", chave);
    try {
      await navigator.clipboard.writeText(absoluta());
      setEstado("link");
    } catch {
      window.prompt("Copie o link da fácies:", absoluta());
    }
  }

  async function copiarImagem() {
    setEstado("copiando");
    // Disparado na INTENCAO, nao no sucesso: o §10 pergunta se o print circula,
    // e a pessoa que caiu no fallback de download compartilhou do mesmo jeito.
    registrarEvento("facies_copiada", chave);
    try {
      const resposta = await fetch(imagem);
      if (!resposta.ok) throw new Error(`imagem indisponível (${resposta.status})`);
      const blob = await resposta.blob();

      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        setEstado("copiado");
        return;
      }

      baixar(blob, `${chave}.png`);
      setEstado("baixado");
    } catch {
      // Última linha: se nem o fetch funcionou, abre a imagem numa aba para a
      // pessoa salvar à mão. Nunca deixa o botão morto sem explicação.
      window.open(imagem, "_blank", "noopener");
      setEstado("pronto");
    }
  }

  // No celular a bandeja do sistema já É o menu, e abrir um menu nosso antes
  // dela seria um passo a mais para chegar no mesmo lugar.
  //
  // A escolha é de ÁRVORE, não de `preventDefault` no clique: o `Trigger` do
  // Radix abre no `pointerdown`, então quando o `onClick` rodasse o menu já
  // estaria aberto e a bandeja subiria por cima dele.
  if (temBandeja) {
    return (
      <button
        type="button"
        onClick={() => void compartilhar()}
        disabled={estado === "copiando"}
        className={BOTAO}
      >
        {rotulo(estado)}
      </button>
    );
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={estado === "copiando"}>
        <button type="button" className={BOTAO}>
          {rotulo(estado)}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="bottom"
          align="start"
          sideOffset={6}
          className="paper-overlay z-50 min-w-[13rem] rounded-surface border border-edge bg-surface py-1"
        >
          <DropdownMenu.Item asChild>
            <button type="button" onClick={abrirWhatsApp} className={ITEM}>
              WhatsApp
            </button>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <button type="button" onClick={() => void copiarLink()} className={ITEM}>
              Copiar link
            </button>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <button type="button" onClick={() => void copiarImagem()} className={ITEM}>
              Copiar imagem
            </button>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/** O mesmo botão nos dois caminhos: quem abre a bandeja e quem abre o menu vê a
 *  mesma coisa, porque para o visitante é a mesma ação. */
const BOTAO =
  "paper-control rounded-control border border-edge bg-surface px-4 py-2 text-sm font-medium text-ink transition hover:bg-surfaceMuted disabled:opacity-60";

/** Alvo de 40px, que é o piso de toque do sistema. */
const ITEM =
  "flex w-full min-h-10 items-center px-4 text-left text-sm text-ink outline-none transition data-[highlighted]:bg-surfaceMuted";

/** O rótulo confirma o que ACONTECEU — o botão é a única resposta que a pessoa
 *  recebe, e "Compartilhar" de novo depois do clique parece que falhou. */
function rotulo(estado: Estado): string {
  if (estado === "copiando") return "Preparando…";
  if (estado === "copiado") return "Imagem copiada";
  if (estado === "baixado") return "Imagem salva";
  if (estado === "link") return "Link copiado";
  return "Compartilhar";
}

/** `facies-enamed` a partir de `/prova/enamed/opengraph-image`. */
function nomeDoArquivo(caminho: string): string {
  const partes = caminho.split("/").filter(Boolean);
  return `facies-${partes[partes.length - 2] ?? "prova"}`;
}

function baixar(blob: Blob, nomeArquivo: string) {
  const endereco = URL.createObjectURL(blob);
  const ancora = document.createElement("a");
  ancora.href = endereco;
  ancora.download = nomeArquivo;
  document.body.appendChild(ancora);
  ancora.click();
  ancora.remove();
  URL.revokeObjectURL(endereco);
}
