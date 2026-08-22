/**
 * O endereço público, num lugar só.
 *
 * A marca é **Fácies** com acento no texto e **facies.app** sem acento no
 * endereço (§3.3). Domínio não carrega diacrítico: um IDN com acento vira
 * punycode (`xn--fcies-hva.app`) na barra do navegador, em e-mail e em qualquer
 * lugar que copie o link — a marca apareceria deformada exatamente onde ela mais
 * precisa ser reconhecida.
 *
 * `NEXT_PUBLIC_SITE_URL` permite apontar para uma prévia da Vercel sem editar
 * código. O default é produção porque o modo de falha importa: uma prévia que
 * gera `og:image` de produção só mostra a imagem errada; produção que gera
 * `og:image` de `localhost` não mostra imagem nenhuma.
 *
 * ⚠️ `NEXT_PUBLIC_*` é inlined em BUILD e visível no navegador. Isto aqui é uma
 * URL pública, então está certo — mas nunca acrescentar segredo a este arquivo.
 */
const BRUTO = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://facies.app";

/** Sem barra final: todo consumidor concatena `/algo`, e `//algo` quebra o canônico. */
export const SITE_URL = BRUTO.replace(/\/+$/, "");

/** Nome da marca em prosa — com acento, sempre. */
export const SITE_NAME = "Fácies";

/**
 * O qualificador. Obrigatório na PRIMEIRA aparição da marca em qualquer contexto
 * novo (folha de marca §01): resultado de busca, cartão do WhatsApp e ícone na
 * tela inicial são três contextos onde "Fácies" chega sozinha e não diz nada.
 */
export const SITE_QUALIFICADOR = "inteligência de prova";

/**
 * O host sem protocolo, para EXIBIR.
 *
 * As imagens de Open Graph escrevem o endereço no rodapé, e "https://" ali é
 * ruído: quem lê um cartão no WhatsApp reconhece `facies.app`, não o esquema.
 * Derivado de `SITE_URL` de propósito — o rodapé da imagem não pode discordar
 * do link que ela acompanha, e foi exatamente isso que aconteceu quando o
 * domínio mudou e o texto dentro da imagem ficou para trás.
 */
export const HOST_VISIVEL = SITE_URL.replace(/^https?:\/\//, "");

/** URL absoluta a partir de um caminho da aplicação. */
export function urlAbsoluta(caminho = "/"): string {
  return `${SITE_URL}${caminho.startsWith("/") ? caminho : `/${caminho}`}`;
}
