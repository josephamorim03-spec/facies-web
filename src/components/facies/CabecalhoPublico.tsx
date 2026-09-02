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
    // O CTA "Ver a minha prova" que a `.topo` da v7 tem continua FORA: a busca
    // fica a uma rolagem curta, e um botão no topo que só rola a página compete
    // com a faixa pela primeira atenção.
    //
    // ⚠️ "Entrar" é outra coisa, e por isso entra. O funil público inteiro não
    // tinha NENHUMA porta de conta: o único `/login` da landing estava enterrado
    // no meio da página, dentro do `PonteDiagnostico`. Quem já tem conta não
    // achava por onde voltar, e quem lia o cartão do fim — que oferece o mês
    // gratuito — não tinha onde se cadastrar.
    //
    // Não é navegação, então não contradiz a régua sem barra: é uma porta só, no
    // canto, onde toda pessoa já espera encontrar. Em texto e não em botão
    // cheio, para não disputar a primeira atenção com o herói.
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-rule py-5">
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
      <Link
        href="/login"
        className="paper-control inline-flex min-h-11 items-center rounded-control px-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        Entrar
      </Link>
    </div>
  );
}
