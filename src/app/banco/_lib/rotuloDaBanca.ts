/**
 * O nome curto da banca — "USP - SP", e não os 90 caracteres do catálogo.
 *
 * O catálogo traz o nome como a fonte o escreve:
 *
 *     SP - Universidade de São Paulo - USP - SP (Hospital das Clínicas da
 *     Faculdade de Medicina da USP - HC)
 *
 * Três coisas sobram: a **UF na frente**, o **hospital-sede entre parênteses**
 * (onde a prova é aplicada, não quem a aplica) e o **nome por extenso**, quando
 * a própria fonte já traz a sigla depois dele.
 *
 * ## Por que a colisão é o problema todo
 *
 * Reduzir à sigla sem cuidado transforma sete bancas em "SMS" e cinco em "SES"
 * — medido no dataset do Fácies, que resolve isso em `lib/facies.ts:nomeCurto`
 * consultando as 141 bancas de uma vez. Dois botões com o mesmo texto são
 * piores que um botão comprido.
 *
 * Aqui a lista inteira também está em memória (o seletor recebe todas as
 * fontes), então dá para usar o mesmo desempate: encurta, conta quantas
 * produzem aquele nome, e só aceita se for única. Senão acrescenta a UF; se
 * ainda empatar, devolve o nome limpo inteiro.
 *
 * ⚠️ Por isso a API é uma função de LISTA, e não de rótulo. Uma função que
 * recebe um nome por vez não tem como saber se ele colide — foi a versão
 * anterior deste arquivo, e ela só sabia tirar o prefixo redundante.
 */

const PREFIXO_UF = /^([A-Z]{2})\s*-\s*/;

/** Tira a UF da frente e o parêntese do fim. */
function limpar(nome: string): string {
  const semParenteses = nome
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
  // Rótulo TODO entre parênteses ficaria vazio, e botão sem texto é inclicável.
  const base = semParenteses || nome.trim();
  return base.replace(PREFIXO_UF, "").trim() || base;
}

function ufDe(nome: string): string {
  return PREFIXO_UF.exec(nome.trim())?.[1] ?? "";
}

/**
 * A sigla, quando a fonte a oferece.
 *
 * O nome vem como "Principal - SIGLA - QUALIFICADOR". A CAUDA depois do
 * primeiro " - " é a sigla com o seu qualificador: "Universidade de São Paulo -
 * USP - SP" vira "USP - SP".
 *
 * Acima de 24 caracteres a "sigla" não é sigla — é outro nome por extenso, e aí
 * o nome principal informa mais.
 */
function encurtar(nome: string): string {
  const limpo = limpar(nome);
  const partes = limpo.split(/\s+-\s+/).map((p) => p.trim()).filter(Boolean);
  if (partes.length >= 2) {
    const cauda = partes.slice(1).join(" - ");
    if (cauda.length <= 24) return cauda;
  }
  return partes[0] || limpo;
}

/**
 * Nome curto para cada rótulo, com colisão resolvida contra a lista inteira.
 *
 * A chave do mapa é o rótulo ORIGINAL — quem chama já o tem em mãos e não
 * precisa repetir a normalização.
 */
export function nomesCurtosDasBancas(rotulos: readonly string[]): Map<string, string> {
  const porCurto = new Map<string, number>();
  const porCurtoComUf = new Map<string, number>();
  for (const rotulo of rotulos) {
    const curto = encurtar(rotulo);
    porCurto.set(curto, (porCurto.get(curto) ?? 0) + 1);
    const uf = ufDe(rotulo);
    const comUf = uf ? `${curto} - ${uf}` : curto;
    porCurtoComUf.set(comUf, (porCurtoComUf.get(comUf) ?? 0) + 1);
  }

  const saida = new Map<string, string>();
  for (const rotulo of rotulos) {
    const curto = encurtar(rotulo);
    if ((porCurto.get(curto) ?? 0) === 1) {
      saida.set(rotulo, curto);
      continue;
    }
    const uf = ufDe(rotulo);
    const comUf = uf ? `${curto} - ${uf}` : curto;
    saida.set(rotulo, (porCurtoComUf.get(comUf) ?? 0) === 1 ? comUf : limpar(rotulo));
  }
  return saida;
}

/**
 * O nome curto de UM rótulo, sem lista para desempatar.
 *
 * Só limpa: tira a UF da frente e o parêntese. **Não** reduz à sigla, porque
 * sem a lista não há como saber se "SMS" é único ou é uma de sete. Use
 * `nomesCurtosDasBancas` sempre que a lista existir.
 */
export function rotuloDaBanca(bruto: string): string {
  const nome = String(bruto ?? "").trim();
  return nome ? limpar(nome) : "";
}
