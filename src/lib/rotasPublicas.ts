/**
 * Quais rotas o guard de borda (`src/proxy.ts`) deixa passar sem sessão.
 *
 * Mora fora do `proxy.ts` para poder ser exercitada sem subir Next
 * (`tests/unit/rotas-publicas.test.mjs`). É fronteira de segurança em uma
 * direção e fronteira de FUNIL na outra: uma rota que devia ser pública e não
 * está simplesmente não existe para quem ainda não tem conta — sem erro, sem
 * log, só um redirect para `/login`.
 *
 * ⚠️ Foi o que aconteceu com `/cadastro`. O botão "Criar a minha conta" do fim
 * da landing aponta para lá, e `/cadastro` não estava em lista nenhuma: todo
 * visitante anônimo que clicava era mandado para `/login?next=%2Fcadastro`. A
 * página de criar conta era inalcançável exatamente para quem não tem conta.
 */

/**
 * Prefixos públicos.
 *
 * ⚠️ A BARRA FINAL NÃO É DECORATIVA: sem ela, `/prova` casa `/provas`, que é
 * rota autenticada. Quem for acrescentar um prefixo aqui: termine em `/` e
 * acrescente o caminho exato ao lado em `PUBLIC_EXACT`, senão `/facies` (sem
 * filho) deixa de abrir.
 */
export const PUBLIC_PREFIXES = [
  "/login",
  "/auth/",
  "/api/",
  "/_next/",
  "/__nextjs",
  "/facies/",
  "/prova/",
] as const;

/**
 * Caminhos públicos EXATOS.
 *
 * `/` é exato, nunca prefixo: todo caminho começa com `/`, então um `/` em
 * `PUBLIC_PREFIXES` abriria o app inteiro sem que a linha parecesse errada.
 *
 * `/termos` e `/privacidade` são públicas porque o BACKEND já as declara assim:
 * `app/api/routers/legal.py` monta `/legal/{kind}` fora do portão de acesso,
 * citando o Decreto 7.962 art. 3, que exige o contrato disponível ANTES da
 * contratação. Sem elas, o link "Termos de Uso" levava a pessoa deslogada para a
 * tela de login — exatamente quem o decreto quer que consiga ler.
 *
 * ⚠️ `/cadastro` é EXATO, e a diferença importa: `/cadastro/completar` e
 * `/cadastro/aceite` são as telas de DEPOIS de autenticar (identidade do titular
 * e aceite dos documentos vigentes). Um prefixo `/cadastro/` aqui abriria as
 * duas para quem não tem sessão — e elas gravam dado pessoal do titular.
 */
export const PUBLIC_EXACT: ReadonlySet<string> = new Set([
  "/",
  "/facies",
  "/auth",
  "/enamed",
  "/termos",
  "/privacidade",
  "/cadastro",
]);

/** Arquivo estático: tem extensão no último segmento. */
const PUBLIC_FILE_REGEX = /\.[^/]+$/;

export function rotaEhPublica(pathname: string): boolean {
  if (PUBLIC_FILE_REGEX.test(pathname)) return true;
  if (PUBLIC_EXACT.has(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}
