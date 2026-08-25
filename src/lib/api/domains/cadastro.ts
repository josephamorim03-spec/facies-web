import { api, authHeader } from "../shared/http";

/**
 * Cadastro: a identidade que o titular informa antes de entrar.
 *
 * Entrar pelo Google criava conta e caía direto no app — o produto sabia o
 * e-mail e mais nada. Sem saber se a pessoa é médica ou acadêmica, quando se
 * forma, ou o que pretende prestar, nada do que a plataforma decide pode ser
 * dimensionado, e a primeira sessão sai genérica para todo mundo.
 *
 * ⚠️ CPF NÃO ESTÁ AQUI. Ele só é necessário para emitir NFS-e, no pagamento. No
 * cadastro seria dado sem finalidade declarável (LGPD art. 6º, III) coletado de
 * quem talvez nunca pague — e é o campo que mais derruba conversão em formulário
 * brasileiro. Entra no checkout.
 */

/** `medico` e `academico` exigem ano de conclusão; `outro` não. */
export type StatusProfissional = "medico" | "academico" | "outro";

export type CadastroStatus = {
  cadastro_completo: boolean;
  /**
   * Tipos de documento vigentes ainda não aceitos. **Vazio enquanto não houver
   * documento publicado** — é o que mantém o cadastro funcionando hoje, e o que
   * faz o checkbox aparecer sozinho no dia em que os textos existirem.
   */
  aceites_pendentes: string[];
};

export type IdentidadeEntrada = {
  full_name: string;
  /** ISO `AAAA-MM-DD`. O backend recusa menor de 18 e data no futuro. */
  birth_date: string;
  professional_status: StatusProfissional;
  /**
   * Sentidos DIFERENTES conforme o status, e quem lê precisa ler os dois juntos:
   * médico → ano em que se formou; acadêmico → ano previsto de conclusão.
   */
  graduation_year?: number | null;
  accepted_terms?: boolean;
  marketing_opt_in?: boolean;
};

export type PerfilEntrada = {
  intended_specialty?: string | null;
  has_prep_course?: boolean | null;
  prep_course_name?: string | null;
  discovery_source?: string | null;
};

export async function obterStatusCadastro(token = ""): Promise<CadastroStatus> {
  return api<CadastroStatus>("/api/cadastro/status", { headers: authHeader(token) });
}

export async function salvarIdentidade(
  dados: IdentidadeEntrada,
  token = "",
): Promise<CadastroStatus> {
  return api<CadastroStatus>("/api/cadastro/identidade", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(dados),
  });
}

/**
 * Perfil declarado do onboarding. Tudo opcional, e **campo omitido não apaga o
 * que já estava** — o formulário é parcial por natureza, e zerar o omitido
 * transformaria "não respondi agora" em "respondi que não".
 */
export async function salvarPerfilDeclarado(
  dados: PerfilEntrada,
  token = "",
): Promise<void> {
  await api<void>("/api/cadastro/perfil", {
    method: "POST",
    headers: authHeader(token),
    body: JSON.stringify(dados),
  });
}
