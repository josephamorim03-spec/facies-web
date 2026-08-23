/**
 * Encurtar texto sem cortar palavra ao meio.
 *
 * As imagens de Open Graph cortavam com `slice(0, n) + "…"` em três lugares, e
 * o resultado circulava no WhatsApp: **"Neoplasias do Sistema Digest…"**. Um
 * termo clínico cortado no meio não lê como abreviação, lê como defeito — e é a
 * primeira coisa que alguém vê do produto.
 *
 * A regra é cortar no último espaço que cabe. Quando isso deixaria um toco
 * (uma palavra única e longa, ou um espaço logo no começo), volta para o corte
 * duro: melhor um cacófato raro do que devolver duas letras.
 *
 * A reticência é o caractere `…`, não três pontos: em fonte proporcional os
 * três pontos ocupam mais e alinham pior, e um leitor de tela lê "ponto ponto
 * ponto".
 */

/** Abaixo desta fração do limite, o corte por palavra deixou pouco demais. */
const PISO_APROVEITAMENTO = 0.6;

export function encurtar(texto: string, limite: number): string {
  const limpo = texto.trim();
  if (limpo.length <= limite) return limpo;

  // -1 abre espaço para a reticência dentro do limite prometido.
  const bruto = limpo.slice(0, limite - 1);
  const ultimoEspaco = bruto.lastIndexOf(" ");

  if (ultimoEspaco >= Math.floor(limite * PISO_APROVEITAMENTO)) {
    // `replace` do final: "Sistema Digestivo," cortado vira "Sistema" e não
    // "Sistema," — pontuação órfã antes de reticência lê como erro de digitação.
    return `${bruto.slice(0, ultimoEspaco).replace(/[\s,;:.\-–—]+$/, "")}…`;
  }

  return `${bruto.replace(/[\s,;:.\-–—]+$/, "")}…`;
}
