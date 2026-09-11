"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { forgotLocalPassword } from "@/lib/api/domains/auth";

/**
 * Entrar com e-mail e senha, ao lado do Google.
 *
 * POR QUE NÃO REUSA `LoginForm`
 * -----------------------------
 * `LoginForm` renderiza o próprio `GoogleSection` dentro dele. Montar os dois
 * na mesma tela ligaria `googleButtonRef` a dois contêineres, e o GSI desenha
 * em um só — o outro ficaria vazio, sem erro. Aqui só existe a via de e-mail; o
 * botão do Google continua sendo responsabilidade de quem compõe a página.
 *
 * "ESQUECI A SENHA" É INLINE, E NÃO UM LINK
 * -----------------------------------------
 * Não existe página para PEDIR a redefinição — `/auth/reset-password` consome o
 * token que chega por e-mail, e é o fim do fluxo, não o começo. Um link para
 * lugar nenhum é pior que nenhum link, e a alternativa (criar a página) pediria
 * ao titular que digitasse de novo o e-mail que ele acabou de digitar aqui.
 *
 * A resposta é UNIFORME por desenho: dizemos "se houver conta, o link foi
 * enviado" mesmo quando não há. Distinguir os dois casos transformaria esta
 * tela num oráculo de quais e-mails têm conta na plataforma.
 */
export type EmailLoginSectionProps = {
  email: string;
  setEmail: (valor: string) => void;
  senha: string;
  setSenha: (valor: string) => void;
  ocupado: boolean;
  erro: string;
  onEntrar: () => void;
};

const CAMPO =
  "w-full border border-edge bg-paper px-3 py-2 text-sm text-ink transition-colors focus:border-ink focus:outline-none";

export function EmailLoginSection({
  email,
  setEmail,
  senha,
  setSenha,
  ocupado,
  erro,
  onEntrar,
}: EmailLoginSectionProps) {
  const [enviandoReset, setEnviandoReset] = useState(false);
  const [resetEnviado, setResetEnviado] = useState(false);
  const [erroReset, setErroReset] = useState("");

  async function pedirRedefinicao() {
    const endereco = email.trim();
    if (!endereco) {
      setErroReset("Informe seu e-mail para receber o link.");
      return;
    }
    if (enviandoReset || resetEnviado) return;
    setEnviandoReset(true);
    setErroReset("");
    try {
      await forgotLocalPassword({ email: endereco });
      setResetEnviado(true);
    } catch {
      setErroReset("Não deu para enviar agora. Tente de novo em instantes.");
    } finally {
      setEnviandoReset(false);
    }
  }

  return (
    <div className="space-y-3">
      {/* `form` e não `onKeyDown` em cada campo: o Enter passa a funcionar por
          comportamento nativo, e o gerenciador de senhas do navegador reconhece
          o par e-mail/senha — que ele não faz com inputs soltos. */}
      <form
        className="space-y-3"
        onSubmit={(evento) => {
          evento.preventDefault();
          onEntrar();
        }}
      >
        <div>
          <label className="sr-only" htmlFor="login-email">
            E-mail
          </label>
          <input
            id="login-email"
            type="email"
            className={CAMPO}
            placeholder="seu@email.com"
            autoComplete="email"
            value={email}
            onChange={(evento) => setEmail(evento.target.value)}
          />
        </div>
        <div>
          <label className="sr-only" htmlFor="login-senha">
            Senha
          </label>
          <input
            id="login-senha"
            type="password"
            className={CAMPO}
            placeholder="Senha"
            autoComplete="current-password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
          />
        </div>

        {erro ? (
          <div
            role="alert"
            className="border border-danger bg-surfaceMuted px-4 py-3 text-center text-sm text-danger"
          >
            {erro}
          </div>
        ) : null}

        <Button type="submit" variant="primary" size="md" loading={ocupado} className="w-full">
          Entrar
        </Button>
      </form>

      <div className="flex items-center justify-center gap-3 text-sm text-muted">
        {resetEnviado ? (
          <span>Se houver conta com esse e-mail, o link de redefinição foi enviado.</span>
        ) : (
          <>
            <button
              type="button"
              onClick={pedirRedefinicao}
              disabled={enviandoReset}
              className="underline underline-offset-2 transition-colors hover:text-ink disabled:opacity-60"
            >
              {enviandoReset ? "Enviando…" : "Esqueci a senha"}
            </button>
            <span aria-hidden="true" className="h-3 w-px bg-rule" />
            <Link
              href="/cadastro"
              className="underline underline-offset-2 transition-colors hover:text-ink"
            >
              Criar conta
            </Link>
          </>
        )}
      </div>

      {erroReset ? (
        <p role="alert" className="text-center text-sm text-danger">
          {erroReset}
        </p>
      ) : null}
    </div>
  );
}
