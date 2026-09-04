/**
 * Quando o cadastro por e-mail pode ser enviado.
 *
 * Mora fora do componente para poder ser exercitado sem navegador
 * (`tests/unit/cadastro-pode-enviar.test.mjs`). A condição que importa aqui é a
 * primeira, e ela é de CONTRATO, não de formulário: `viaEmailDisponivel` vem de
 * `GET /auth/modes`, ou seja, do `AUTH_MODE` do backend.
 *
 * Em produção o alvo é google-only (`docs/production-readiness.md`;
 * `runtime_checks._security_checks` reprova o boot com qualquer outro valor), e
 * nesse modo o router de auth local nem é registrado em `main.py`: `POST
 * /auth/signup` responde **404**. Esconder o formulário sem também travar o
 * envio seria cosmético — a tela montada antes da resposta de `/auth/modes`, ou
 * um DOM adulterado, ainda dispararia o POST.
 */
export type EstadoDoCadastro = {
  /** `GET /auth/modes` disse que esta instalação aceita conta por e-mail. */
  viaEmailDisponivel: boolean;
  /** `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`; sem ela o backend recusa de qualquer jeito. */
  recaptchaSiteKey: string;
  busy: boolean;
  email: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
  captchaToken: string;
};

export function podeEnviarCadastro(estado: EstadoDoCadastro): boolean {
  if (!estado.viaEmailDisponivel) return false;
  if (estado.busy || !estado.recaptchaSiteKey) return false;
  if (!estado.email.trim() || !estado.password || !estado.confirmPassword) return false;
  if (estado.password !== estado.confirmPassword) return false;
  if (!estado.termsAccepted || !estado.captchaToken) return false;
  return true;
}
