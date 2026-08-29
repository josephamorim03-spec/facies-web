import Link from "next/link";

import { FaciesWordmark } from "@/components/FaciesWordmark";
import { SITE_QUALIFICADOR } from "@/lib/site";

/**
 * A marca no topo do funil público.
 *
 * A home abria direto na tese ("A sua prova tem uma fácies.") sem nenhum
 * wordmark. Era uma escolha defensável de landing — não gastar a primeira dobra
 * com logotipo — mas cobra um preço específico neste produto: **o nome é um
 * termo médico**. Quem chega pelo link do grupo lê "fácies" como a palavra que
 * já conhece da semiologia, e não tem como saber que também é o nome de uma
 * ferramenta. Sai sem marca nenhuma na cabeça.
 *
 * O qualificador vem junto porque esta é a primeira aparição da marca para essa
 * pessoa, e a folha de marca é explícita: "Fácies" sozinha, num contexto novo,
 * não diz o que é.
 *
 * A régua embaixo separa a marca do conteúdo sem virar uma barra — o funil não
 * tem navegação, e desenhar uma sugeriria seções que não existem.
 */
export function CabecalhoPublico({ comLink = false }: { comLink?: boolean }) {
  const marca = (
    <span className="inline-flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
      <FaciesWordmark size="sm" />
      <span className="text-sm text-muted">{SITE_QUALIFICADOR}</span>
    </span>
  );

  return (
    // Só a marca. O CTA "Ver a minha prova" que a `.topo` da v7 tem foi
    // retirado a pedido: a busca fica a uma rolagem curta, e um botão no topo
    // que só rola a página compete com a faixa pela primeira atenção.
    <div className="border-b border-rule py-5">
      {comLink ? (
        <Link
          href="/"
          className="inline-flex rounded-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {marca}
        </Link>
      ) : (
        // Na própria home a marca NÃO é link: um segundo caminho para a página
        // em que já se está só acrescenta algo que reage ao mouse sem levar a
        // lugar nenhum.
        marca
      )}
    </div>
  );
}
