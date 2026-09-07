import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Os arquivos do BACKEND que alguns testes daqui leem — quando eles existem.
 *
 * ## Por que isto precisou existir
 *
 * Estes testes nasceram num monorepo em que `web/` e `app/` eram irmãos, e eles
 * atravessam a fronteira de propósito: comparam a allowlist de eventos do
 * Python com o tipo do TypeScript, os quatro modos do domínio com o seletor da
 * tela, e a promessa do documento canônico com a copy publicada. São testes de
 * CONTRATO, e o valor deles é justamente não caber num repositório só.
 *
 * Com o frontend separado (o backend é privado; este repo é público para que a
 * CI custe zero), o caminho `../../../app/...` deixou de existir aqui — e os
 * quatro testes quebraram na primeira execução.
 *
 * 🚨 A SAÍDA ERRADA SERIA APAGÁ-LOS. A separação torna a deriva entre os dois
 * lados MAIS provável, não menos: agora são dois repositórios, dois deploys e
 * duas revisões. Um contrato deixa de ser verificado exatamente quando passa a
 * precisar mais de verificação.
 *
 * Então eles PULAM, com motivo na tela, quando o backend não está ao lado — e
 * continuam rodando de verdade em quem tem os dois repositórios lado a lado.
 *
 * ⚠️ Pular não é verificar. O lugar definitivo desta checagem é a CI do
 * repositório privado, que tem o `app/` e pode buscar este frontend público.
 * Enquanto isso não existir, o contrato está protegido apenas no ambiente de
 * quem trabalha com os dois clones.
 */
export const MOTIVO =
  "o backend não está ao lado (repositório separado) — rode com os dois clones irmãos";

/**
 * O conteúdo de um arquivo do backend, ou `null` se ele não estiver acessível.
 *
 * `null`, e não string vazia: um teste que recebesse `""` compararia contra o
 * vazio e PASSARIA, que é o modo de falha que este módulo existe para impedir.
 */
export function fonteDoBackend(relativoAoRepo) {
  // A saída explícita, e a primeira a ser tentada: quem tem os dois clones em
  // qualquer arranjo aponta `FACIES_BACKEND_DIR` para o diretório que contém
  // `app/` e `docs/`. Adivinhar layout de diretório é frágil por natureza —
  // esta variável é o que torna a checagem confiável em vez de sortuda.
  const declarado = process.env.FACIES_BACKEND_DIR;
  const candidatos = [
    ...(declarado ? [new URL(`file://${declarado.replace(/\\/g, "/")}/${relativoAoRepo}`)] : []),
    // o layout do monorepo, em que este arquivo vive em `krosmed/web/tests/unit`
    new URL(`../../../${relativoAoRepo}`, import.meta.url),
    // clones irmãos, nos nomes que este projeto de fato usa
    new URL(`../../../krosmed/${relativoAoRepo}`, import.meta.url),
    new URL(`../../../faciesapp/krosmed/${relativoAoRepo}`, import.meta.url),
    new URL(`../../../../faciesapp/krosmed/${relativoAoRepo}`, import.meta.url),
  ];
  for (const url of candidatos) {
    try {
      return readFileSync(fileURLToPath(url), "utf8");
    } catch {
      // tenta o próximo
    }
  }
  return null;
}
