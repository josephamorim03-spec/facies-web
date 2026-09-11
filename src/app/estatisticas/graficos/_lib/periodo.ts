/**
 * O período das séries — num lugar só.
 *
 * O rótulo já tinha deixado de ser o texto fixo "Últimas 12 semanas" repetido
 * em dois sítios, mas o NÚMERO de semanas continuava escrito duas vezes: o
 * `default` da secção e o que a página supunha ao anunciar o período. Agora o
 * cabeçalho da página e a consulta leem o mesmo valor.
 *
 * ⚠️ Minúsculas de propósito. A linha em mono sob o título é a mesma do resto
 * do app (`banco/guardadas`: "12 questões guardadas") — ela é a procedência do
 * número, e não uma frase.
 */
export const SEMANAS_PADRAO = 12;

export function rotuloDoPeriodo(semanas: number): string {
  if (semanas % 52 === 0) return semanas === 52 ? "último ano" : `últimos ${semanas / 52} anos`;
  return `últimas ${semanas} semanas`;
}
