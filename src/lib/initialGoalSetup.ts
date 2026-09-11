import { getProfile } from "@/lib/api";
import { obterStatusCadastro } from "@/lib/api/domains/cadastro";
import { getOnboarding } from "@/lib/api/domains/study-plan";
import {
  buildStudyImportRuntimePath,
  readActiveStudyImportSessionId,
} from "@/lib/studyImportRuntime";

export const INITIAL_GOAL_SETUP_ROUTE = "/preferencias";
export const ONBOARDING_ROUTE = "/onboarding";
/**
 * ⚠️ `/inicio`, e nao `/hoje` — mudou em 2026-09-10 com a barra nova.
 *
 * `/hoje` continua a ser tela viva (a agenda do dia inteira), mas deixou de ser
 * a HOME: o Inicio e' o resumo, e uma home que nao e' o destino de aterragem e'
 * uma home que o aluno so' encontra por engano.
 */
export const DEFAULT_AUTHENTICATED_ROUTE = "/inicio";
export const ACTIVATE_ROUTE = "/ativar-acesso";
export const CADASTRO_ROUTE = "/cadastro/completar";
export const ACEITE_ROUTE = "/cadastro/aceite";

export async function requiresInitialGoalSetup(token: string): Promise<boolean> {
  const profile = await getProfile(token);
  return !profile.has_completed_initial_goal_setup;
}

/**
 * Rota de setup para um aluno novo.
 *
 * O wizard da trilha está atrás de `ENABLE_ADAPTIVE_STUDY_PLAN_V1`, que o
 * browser não enxerga. Em vez de duplicar a flag no cliente, detectamos por
 * comportamento: com a flag desligada `/onboarding` responde 404 e o fluxo
 * antigo (`/preferencias`) continua valendo.
 */
async function resolveSetupRoute(token: string): Promise<string> {
  try {
    const onboarding = await getOnboarding(token);
    if (onboarding.next_step !== "ready") {
      return ONBOARDING_ROUTE;
    }
    return INITIAL_GOAL_SETUP_ROUTE;
  } catch {
    return INITIAL_GOAL_SETUP_ROUTE;
  }
}

type Profile = Awaited<ReturnType<typeof getProfile>>;

/**
 * A rota que este perfil é OBRIGADO a visitar, ou `null` se ele pode navegar à
 * vontade.
 *
 * Esta é a definição única da escada de bloqueio. Ela existe porque havia duas:
 * esta ordem aqui, e uma cópia no `AppShell`, que não conhecia
 * `cadastro_completo` e mandava direto para `/preferencias`. Na prática o
 * usuário novo era mandado para `/cadastro/completar` por esta função e
 * **rebotado** para `/preferencias` pela outra no instante seguinte — cadastro
 * incompleto para sempre, sem nenhum erro aparecer.
 *
 * Duas perguntas diferentes, um degrau só: "onde eu aterrisso depois do login?"
 * (`resolveAuthenticatedLandingRoute`) e "posso ficar onde estou?" (`AppShell`).
 * Ambas dependem desta mesma ordem, e é por isso que ela mora sozinha.
 *
 * A IDENTIDADE VEM ANTES DE TUDO, inclusive do acesso. Entrar pelo Google
 * autentica, mas não cadastra: o produto ficava sabendo o e-mail e mais nada.
 * Perguntar por assinatura antes de saber se a pessoa é médica ou acadêmica é
 * oferecer sem saber o quê, e o onboarding logo abaixo dimensiona a rotina com
 * base em quem ela é.
 *
 * `profile` é opcional para quem já buscou: `cadastro_completo` e
 * `access_status` vêm do mesmo `GET /profile`, então passar o perfil que você já
 * tem evita uma requisição repetida no caminho quente da navegação.
 *
 * ⚠️ `aceitesPendentes` também é opcional, e a assimetria é DELIBERADA. Ele não
 * vem de `/profile` — sai de `GET /cadastro/status`, que é uma requisição a
 * mais. Quem chama uma vez por login (o `resolveAuthenticatedLandingRoute`
 * abaixo) paga e passa o valor; o guard de navegação do `AppShell`, que roda a
 * CADA troca de rota, omite e pula esse degrau.
 *
 * Isso significa que uma versão nova dos Termos publicada no meio da sessão só
 * pega a pessoa no login seguinte, e está certo assim: o ponto onde o aceite é
 * legalmente indispensável é o checkout, e lá ele é recusa dura, não redirect.
 * Não "conserte" isto movendo a consulta para o guard — seria dobrar as
 * requisições de toda navegação do app para antecipar horas de uma tela que
 * ninguém está pagando ainda.
 */
export async function resolveBlockingRoute(
  token: string,
  profile?: Profile,
  aceitesPendentes?: string[],
): Promise<string | null> {
  const resolved = profile ?? (await getProfile(token));
  if (!resolved.cadastro_completo) {
    return CADASTRO_ROUTE;
  }
  // Depois da identidade e ANTES do acesso: sem base contratual não se cobra.
  if (aceitesPendentes && aceitesPendentes.length > 0) {
    return ACEITE_ROUTE;
  }
  if (resolved.access_status !== "active") {
    return ACTIVATE_ROUTE;
  }
  if (!resolved.has_completed_initial_goal_setup) {
    return resolveSetupRoute(token);
  }
  return null;
}

export async function resolveAuthenticatedLandingRoute(token: string): Promise<string> {
  const profile = await getProfile(token);
  // Uma vez por login: aqui a consulta extra cabe. Vazio enquanto `app/legal/`
  // não tiver documento — é o que mantém o degrau inerte hoje.
  let aceitesPendentes: string[] = [];
  try {
    aceitesPendentes = (await obterStatusCadastro(token)).aceites_pendentes;
  } catch {
    // Falha transitória em `/cadastro/status` não pode trancar o login. O
    // checkout ainda recusa sem aceite, então nada passa por descuido.
  }
  const blocking = await resolveBlockingRoute(token, profile, aceitesPendentes);
  if (blocking) {
    return blocking;
  }
  const activeImportSessionId = readActiveStudyImportSessionId();
  if (activeImportSessionId) {
    return buildStudyImportRuntimePath(activeImportSessionId);
  }
  return DEFAULT_AUTHENTICATED_ROUTE;
}
