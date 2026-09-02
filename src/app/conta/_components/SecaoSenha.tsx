"use client";

import { useEffect, useMemo, useState } from "react";

import { definirSenha } from "@/lib/api/domains/account";
import { obterModosDeAuth } from "@/lib/api/domains/auth";

/**
 * Definir a senha — a porta de saída do Google.
 *
 * ## Por que esta seção existe
 *
 * Produção roda `AUTH_MODE` google-only, então toda conta nasceu pelo Google e
 * não tem senha. Quem perde o acesso à conta Google perde o Fácies junto, e não
 * há recuperação: `forgot-password` só age sobre contas locais, e responde
 * "enviamos" mesmo quando não envia — a resposta é uniforme de propósito, para
 * não revelar quais e-mails existem.
 *
 * Aqui a sessão viva é a prova de identidade, então definir a primeira senha não
 * depende de e-mail nenhum. Isso importa: é o caminho para sair do Google, e
 * fazê-lo depender de entrega de e-mail seria trocar uma dependência por outra.
 *
 * ## Por que o campo "senha atual" aparece SÓ depois do 403
 *
 * A tela não sabe, ao abrir, se a conta já tem senha — e não há rota que diga.
 * Poderia perguntar ao servidor com um campo novo em `/me`, mas isso é contrato
 * novo para uma informação que a própria tentativa revela.
 *
 * Então ela tenta sem. Quem nunca teve senha nunca vê um campo que não saberia
 * preencher; quem tem recebe 403 e o campo aparece com a explicação. O servidor
 * continua sendo quem decide — omitir o campo não dispensa a exigência.
 */
export function SecaoSenha() {
  // ⚠️ A seção SOME quando o login por e-mail não está registrado.
  //
  // Em `AUTH_MODE=google` o backend não monta `/auth/login`, então a senha
  // definida aqui não abriria porta nenhuma. Oferecer o campo assim mandaria a
  // pessoa guardar uma senha inútil e se sentir protegida contra a perda da
  // conta Google — que é justamente o risco que ela veio resolver. Senha que
  // não entra é pior que senha nenhuma, porque a segunda ninguém confia.
  //
  // Começa `null` (indeciso) e não `true`: piscar o formulário para depois
  // escondê-lo é a mesma promessa falsa, só que mais curta. `obterModosDeAuth`
  // nunca lança e devolve `null` na falha — e aí a seção continua escondida.
  const [localDisponivel, setLocalDisponivel] = useState<boolean | null>(null);
  const [nova, setNova] = useState("");
  const [confirma, setConfirma] = useState("");
  const [atual, setAtual] = useState("");
  const [pedeAtual, setPedeAtual] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState<string | null>(null);

  // A MESMA regra de `is_password_valid`, para a pessoa saber antes de errar.
  // O servidor continua decidindo; isto só antecipa a mensagem.
  const forca = useMemo(
    () => ({
      tamanho: nova.length >= 12,
      maiuscula: /[A-Z]/.test(nova),
      minuscula: /[a-z]/.test(nova),
      digito: /\d/.test(nova),
    }),
    [nova],
  );
  useEffect(() => {
    let vivo = true;
    obterModosDeAuth().then((modos) => {
      if (vivo) setLocalDisponivel(modos?.local_auth ?? false);
    });
    return () => {
      vivo = false;
    };
  }, []);

  const valida = Object.values(forca).every(Boolean);
  const conferem = confirma.length > 0 && nova === confirma;
  const podeEnviar = valida && conferem && !enviando && (!pedeAtual || atual.length > 0);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!podeEnviar) return;
    setEnviando(true);
    setErro(null);
    setPronto(null);
    try {
      const r = await definirSenha(nova, pedeAtual ? atual : undefined);
      setPronto(
        r.senha_criada
          ? `Pronto. Agora você também entra com ${r.email} e esta senha.`
          : "Senha trocada. As outras sessões foram encerradas.",
      );
      setNova("");
      setConfirma("");
      setAtual("");
      setPedeAtual(false);
    } catch (e) {
      const status = (e as { status?: number })?.status;
      if (status === 403) {
        // Revelação progressiva: a conta já tinha senha. Só agora o campo faz
        // sentido, e a mensagem explica por que ele apareceu.
        setPedeAtual(true);
        setErro(
          atual.length > 0
            ? "Senha atual incorreta."
            : "Esta conta já tem senha. Informe a atual para trocá-la.",
        );
      } else if (status === 409) {
        setErro("Sua conta não tem e-mail confirmado. Fale com o suporte.");
      } else {
        setErro("Não deu para salvar agora. Tente de novo em instantes.");
      }
    } finally {
      setEnviando(false);
    }
  }

  if (!localDisponivel) return null;

  return (
    <section className="mt-6 rounded-surface border border-edge bg-surface p-5 sm:p-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Senha</h2>
      <p className="mt-1 max-w-[62ch] text-sm text-muted">
        Defina uma senha para entrar com e-mail, além do Google. Se um dia você perder
        o acesso à conta Google, é ela que mantém o Fácies acessível.
      </p>

      <form className="mt-4 max-w-sm space-y-3" onSubmit={enviar} noValidate>
        {pedeAtual ? (
          <div>
            <label htmlFor="senha-atual" className="block text-sm font-semibold text-ink">
              Senha atual
            </label>
            <input
              id="senha-atual"
              type="password"
              autoComplete="current-password"
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
              className="paper-control mt-1.5 w-full rounded-control border border-edge bg-surfaceMuted px-3 py-2 text-sm text-ink"
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="senha-nova" className="block text-sm font-semibold text-ink">
            Nova senha
          </label>
          <input
            id="senha-nova"
            type="password"
            autoComplete="new-password"
            value={nova}
            onChange={(e) => setNova(e.target.value)}
            aria-describedby="regras-senha"
            className="paper-control mt-1.5 w-full rounded-control border border-edge bg-surfaceMuted px-3 py-2 text-sm text-ink"
          />
          <ul id="regras-senha" className="mt-2 space-y-0.5 text-xs leading-5 text-muted">
            {[
              [forca.tamanho, "Ao menos 12 caracteres"],
              [forca.maiuscula, "Uma letra maiúscula"],
              [forca.minuscula, "Uma letra minúscula"],
              [forca.digito, "Um número"],
            ].map(([ok, rotulo]) => (
              <li key={String(rotulo)} className={ok ? "text-ink" : undefined}>
                {ok ? "✓" : "·"} {rotulo}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label htmlFor="senha-confirma" className="block text-sm font-semibold text-ink">
            Repita a nova senha
          </label>
          <input
            id="senha-confirma"
            type="password"
            autoComplete="new-password"
            value={confirma}
            onChange={(e) => setConfirma(e.target.value)}
            className="paper-control mt-1.5 w-full rounded-control border border-edge bg-surfaceMuted px-3 py-2 text-sm text-ink"
          />
          {confirma.length > 0 && !conferem ? (
            <p className="mt-1.5 text-sm text-danger">As senhas não são iguais.</p>
          ) : null}
        </div>

        {erro ? (
          <p role="alert" className="text-sm text-danger">
            {erro}
          </p>
        ) : null}
        {pronto ? (
          <p role="status" className="text-sm text-ink">
            {pronto}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!podeEnviar}
          className="paper-control rounded-control border border-primary bg-primary px-4 py-2 text-sm font-semibold text-primaryInk disabled:opacity-50"
        >
          {enviando ? "Salvando…" : "Salvar senha"}
        </button>
      </form>
    </section>
  );
}
