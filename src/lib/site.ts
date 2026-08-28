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
 *
 * Era "inteligência de prova". A troca importa porque o qualificador tem UM
 * trabalho — fazer o nome significar alguma coisa — e o anterior não fazia.
 *
 * Em semiologia, *fácies* é a cara característica que uma doença dá ao paciente:
 * fácies leonina, fácies mitrálica, fácies de máscara. O médico reconhece a
 * doença pela cara. A tese do produto é esse mesmo movimento aplicado à prova —
 * cada banca tem uma cara reconhecível, e dá para aprender a ler.
 *
 * "Inteligência de prova" é rótulo de prateleira: diz em que categoria o produto
 * fica, e toda edtech diz "inteligência". "A cara da sua prova" ensina a
 * metáfora em cinco palavras, para um público que já conhece o termo.
 *
 * O registro coloquial contrasta com a direção sóbria do sistema, e o contraste
 * é a favor: tipografia de laudo com frase de corredor lê como confiança.
 */
export const SITE_QUALIFICADOR = "a cara da sua prova";

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

/**
 * O contêiner da landing, num lugar só.
 *
 * 1080px é o `.cont` do projeto de design, MEDIDO nele renderizado — não lido
 * do CSS. `max-w-5xl` do Tailwind são 1024: 56px a menos, perto o bastante
 * para passar despercebido e errado o bastante para a manchete quebrar antes
 * do ponto onde o desenho a quebra.
 *
 * ⚠️ Existe como constante porque a divergência JÁ ACONTECEU. O herói, o
 * cabeçalho e o rodapé foram corrigidos para 1080 numa rodada; as cinco seções
 * (`SecaoAposta`, `SecaoNoveMedidas`, `SecaoOndeEncaixa`, `SecaoSemLetraMiuda`,
 * `SecaoPreco`) ficaram em `max-w-5xl` porque cada uma repetia o literal. O
 * resultado era a coluna estreitando 56px ao rolar do herói para a primeira
 * seção — o tipo de defeito que ninguém aponta e todo mundo sente.
 *
 * O guard `verificar:design` mede `main > div`, que é o cabeçalho: ele nunca
 * teria visto as seções. Constante compartilhada é o que fecha isso, não mais
 * um teste.
 */
export const CONT_LANDING = "mx-auto w-full max-w-[1080px] px-[var(--gutter)]";
