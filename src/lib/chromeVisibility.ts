import { ACTIVATE_ROUTE } from "@/lib/initialGoalSetup";
import { isStudyImportImmersivePath } from "@/lib/studyImportRuntime";

/**
 * Onde o chrome de navegação do app **não** aparece.
 *
 * Isto existia DUAS vezes, e as duas cópias divergiram — que é o modo de falha
 * de toda regra duplicada. `AppShell.shouldHideNavigationChrome` conhecia as
 * superfícies públicas da Fácies; `Nav.useNavHideCompletely` não. Como a
 * `SidebarNav` consultava a segunda, o visitante anônimo que abria
 * `/prova/enamed` pelo link do grupo via a barra lateral do app autenticado do
 * lado — chrome de um produto que ele ainda não tem, com ícones que só levam ao
 * login.
 *
 * O mais revelador: alguém já tinha consertado no `AppShell`, com um comentário
 * descrevendo exatamente esse sintoma. O defeito sobreviveu ao conserto porque
 * a segunda cópia não estava à vista.
 *
 * As quatro razões para esconder, e elas são diferentes entre si:
 *
 * 1. **Público** (`/`, `/facies/*`, `/prova/*`, `/cadastro`, `/termos`, `/privacidade`, `/enamed`) — quem lê ainda não é aluno.
 * 2. **Antes da sessão** (`/login`, `/auth/*`, `/ativar`) — não há para onde
 *    navegar.
 * 3. **Imersivo** (`/banco/sessao/*`, importação de estudo) — a tela tem a
 *    própria saída, e a barra competiria com a questão.
 *
 * `startsWith("/prova")` cobre `/prova/[slug]` sem casar `/provas`? **Cobre e
 * casa**: `"/provas".startsWith("/prova")` é `true`. Aqui isso é inofensivo e
 * até desejável — `/provas` só redireciona, então esconder o chrome nela evita
 * uma piscada de barra antes do salto. No `proxy.ts` a mesma colisão seria um
 * furo de autenticação, e lá o prefixo termina em barra de propósito.
 */
export function deveEsconderChrome(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/facies") ||
    pathname.startsWith("/prova") ||
    pathname.startsWith("/cadastro") ||
    pathname.startsWith("/termos") ||
    pathname.startsWith("/privacidade") ||
    pathname.startsWith("/enamed") ||
    pathname === ACTIVATE_ROUTE ||
    pathname.startsWith("/banco/sessao") ||
    isStudyImportImmersivePath(pathname)
  );
}
