/**
 * As chaves de funcionalidade do app do aluno.
 *
 * ## Por que existe um módulo só para isto
 *
 * `FLASHCARDS_LIGADOS` vivia privado dentro de `navConfig.ts`, que é sobre
 * NAVEGAÇÃO. O efeito é que a barra sabia esconder a aba Cards e mais ninguém
 * sabia de nada: o fim de sessão continuou empurrando para `/cards` em cinco
 * lugares, o cronograma emitia `href: "/cards"`, as preferências mostravam um
 * controlo de retenção do FSRS e os gráficos montavam a análise de cards — tudo
 * com a chave desligada, tudo aterrissando em `/hoje` por um 307 silencioso.
 *
 * Uma chave que só um arquivo consegue ler não é uma chave: é um detalhe de
 * implementação daquele arquivo.
 *
 * ⚠️ `NEXT_PUBLIC_*` é inlined em BUILD. Mudar a env exige `next build` novo —
 * não basta reiniciar o servidor.
 */
export const FLASHCARDS_LIGADOS = process.env.NEXT_PUBLIC_FLASHCARDS === "1";
