"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getProfile } from "@/lib/api";
import {
  obterStatusCadastro,
  salvarIdentidade,
  type StatusProfissional,
} from "@/lib/api/domains/cadastro";
import { resolveAuthenticatedLandingRoute } from "@/lib/initialGoalSetup";
import { LoadBar } from "@/components/ui/LoadBar";

/**
 * O cadastro que faltava entre autenticar e entrar.
 *
 * Entrar pelo Google criava conta e caía direto no app: o produto sabia o e-mail
 * e mais nada. Sem saber se a pessoa é médica ou acadêmica, quando se forma, e o
 * que pretende prestar, nada do que a plataforma decide pode ser dimensionado —
 * a primeira sessão sai igual para todo mundo.
 *
 * ## O que esta tela NÃO pede, e por quê
 *
 * **CPF.** Ele só é necessário para emitir NFS-e, que acontece no pagamento.
 * Aqui seria dado sem finalidade declarável (LGPD art. 6º, III) coletado de quem
 * talvez nunca pague — e é o campo que mais derruba conversão em formulário
 * brasileiro. Entra no checkout, com base de obrigação legal.
 *
 * **Bancas prioritárias e prova-alvo.** Já são perguntadas no onboarding, e o
 * `student_objectives_service` documenta que `priority_boards` e objetivo não
 * são sinônimos. Repetir aqui criaria uma terceira fonte para a mesma pergunta —
 * e três fontes é o começo de três respostas diferentes.
 *
 * **Especialidade, cursinho e "como conheceu".** São opcionais e de base legal
 * distinta (legítimo interesse), então vivem no onboarding. Misturar o opcional
 * com o obrigatório faria os dois parecerem a mesma coisa.
 */

const STATUS: { valor: StatusProfissional; rotulo: string; ajuda: string }[] = [
  { valor: "medico", rotulo: "Médico(a)", ajuda: "já formado" },
  { valor: "academico", rotulo: "Acadêmico(a)", ajuda: "ainda na graduação" },
  { valor: "outro", rotulo: "Outro", ajuda: "" },
];

export default function CompletarCadastroPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [nascimento, setNascimento] = useState("");
  const [status, setStatus] = useState<StatusProfissional | "">("");
  const [ano, setAno] = useState("");
  const [aceite, setAceite] = useState(false);
  const [marketing, setMarketing] = useState(false);
  // Vazio enquanto não houver documento publicado — e então o bloco de aceite
  // não aparece. Ver `legal_document_service`: o sistema é inerte por desenho.
  const [aceitesPendentes, setAceitesPendentes] = useState<string[]>([]);

  useEffect(() => {
    let vivo = true;
    Promise.all([getProfile(""), obterStatusCadastro("")])
      .then(([perfil, statusCadastro]) => {
        if (!vivo) return;
        if (statusCadastro.cadastro_completo) {
          resolveAuthenticatedLandingRoute("")
            .then((rota) => router.replace(rota))
            .catch(() => router.replace("/hoje"));
          return;
        }
        // O Google já entregou o nome: adiantar o campo evita redigitar o que a
        // pessoa acabou de autorizar a compartilhar.
        if (perfil.display_name) setNome(perfil.display_name);
        setAceitesPendentes(statusCadastro.aceites_pendentes);
        setCarregando(false);
      })
      .catch(() => {
        if (vivo) router.replace("/login");
      });
    return () => {
      vivo = false;
    };
  }, [router]);

  const exigeAno = status === "medico" || status === "academico";
  const rotuloAno =
    status === "medico" ? "Ano em que se formou" : "Ano previsto de conclusão";

  const podeEnviar = useMemo(() => {
    if (!nome.trim() || !nascimento || !status) return false;
    if (exigeAno && !ano) return false;
    if (aceitesPendentes.length > 0 && !aceite) return false;
    return !salvando;
  }, [nome, nascimento, status, exigeAno, ano, aceitesPendentes, aceite, salvando]);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!podeEnviar || !status) return;
    setSalvando(true);
    setErro(null);
    try {
      await salvarIdentidade({
        full_name: nome.trim(),
        birth_date: nascimento,
        professional_status: status,
        graduation_year: exigeAno ? Number(ano) : null,
        accepted_terms: aceite,
        marketing_opt_in: marketing,
      });
      router.replace(await resolveAuthenticatedLandingRoute(""));
    } catch (e) {
      // A mensagem do backend é específica — "e necessario ter ao menos 18
      // anos", "medico ja formado: informe o ano em que concluiu" — e agora
      // CHEGA aqui.
      //
      // ⚠️ Não chegava. Este comentário já afirmava que chegava, e era verdade
      // sobre o backend e mentira sobre a tela: o `detail` de um 422 do Pydantic
      // é uma LISTA, `toAPIError` só lia string ou objeto com `.message`, e o
      // aluno via `Request failed: 422` — nesta tela, que é obrigatória para
      // todo mundo que entra pelo Google. Ver `shared/validationMessage.ts`.
      const detalhe = e instanceof Error ? e.message : "";
      setErro(detalhe || "Não consegui salvar. Confira os campos e tente de novo.");
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="w-full max-w-xs">
          <LoadBar label="Carregando seu cadastro" />
          <p className="paper-eyebrow mt-2">Carregando</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-10">
      <main className="mx-auto w-full max-w-lg">
        <span className="paper-eyebrow">Falta pouco</span>
        <h1 className="mt-3 font-serif text-2xl font-semibold leading-snug text-ink">
          Antes de entrar, quem é você?
        </h1>
        <p className="mt-3 max-w-[52ch] text-sm leading-6 text-muted">
          A Fácies dimensiona o que recomenda pela sua situação e pelo seu tempo. Sem isto,
          a primeira sessão sai igual para todo mundo — que é exatamente o que ela existe
          para não fazer.
        </p>

        <form className="mt-8 space-y-6" onSubmit={enviar} noValidate>
          <div>
            <label htmlFor="nome" className="block text-sm font-semibold text-ink">
              Nome completo <span className="text-danger">*</span>
            </label>
            <input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              autoComplete="name"
              required
              className="paper-control mt-2 w-full rounded-control border border-edge bg-surface px-3 py-2.5 text-sm text-ink"
            />
          </div>

          <div>
            <label htmlFor="nascimento" className="block text-sm font-semibold text-ink">
              Data de nascimento <span className="text-danger">*</span>
            </label>
            <input
              id="nascimento"
              type="date"
              value={nascimento}
              onChange={(e) => setNascimento(e.target.value)}
              autoComplete="bday"
              required
              className="paper-control mt-2 w-full rounded-control border border-edge bg-surface px-3 py-2.5 text-sm text-ink"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-ink">
              Situação <span className="text-danger">*</span>
            </legend>
            <div className="mt-2 grid gap-2">
              {STATUS.map((opcao) => (
                <label
                  key={opcao.valor}
                  className="flex cursor-pointer items-center gap-3 rounded-control border border-edge bg-surface px-3 py-2.5"
                >
                  <input
                    type="radio"
                    name="situacao"
                    value={opcao.valor}
                    checked={status === opcao.valor}
                    onChange={() => setStatus(opcao.valor)}
                  />
                  <span className="text-sm text-ink">
                    {opcao.rotulo}
                    {opcao.ajuda ? (
                      <span className="text-muted"> — {opcao.ajuda}</span>
                    ) : null}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          {/* O rótulo MUDA com a situação: o mesmo campo guarda o ano em que a
              pessoa se formou (médico) ou o previsto (acadêmico). Perguntar
              "ano de conclusão" para os dois faria metade responder o passado e
              metade o futuro na mesma coluna. */}
          {exigeAno ? (
            <div>
              <label htmlFor="ano" className="block text-sm font-semibold text-ink">
                {rotuloAno} <span className="text-danger">*</span>
              </label>
              <input
                id="ano"
                type="number"
                inputMode="numeric"
                value={ano}
                onChange={(e) => setAno(e.target.value)}
                placeholder="2027"
                required
                className="paper-control mt-2 w-full rounded-control border border-edge bg-surface px-3 py-2.5 text-sm text-ink"
              />
            </div>
          ) : null}

          {/* Só existe quando há documento publicado. Enquanto `app/legal/`
              estiver vazio, `aceites_pendentes` vem vazio e o bloco não aparece —
              pedir aceite de um texto que ninguém escreveu é pior que não pedir. */}
          {aceitesPendentes.length > 0 ? (
            <label className="flex cursor-pointer items-start gap-3 border-t border-rule pt-5">
              <input
                type="checkbox"
                checked={aceite}
                onChange={(e) => setAceite(e.target.checked)}
                className="mt-0.5"
                required
              />
              <span className="text-sm leading-6 text-ink">
                Li e aceito os{" "}
                <Link href="/termos" className="font-semibold text-primary underline">
                  Termos de Uso
                </Link>{" "}
                e a{" "}
                <Link href="/privacidade" className="font-semibold text-primary underline">
                  Política de Privacidade
                </Link>
                . <span className="text-danger">*</span>
              </span>
            </label>
          ) : null}

          {/* Base legal distinta do aceite (consentimento, LGPD art. 7º I),
              opcional e DESMARCADO por padrão. Ausência é não. */}
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={marketing}
              onChange={(e) => setMarketing(e.target.checked)}
              className="mt-0.5"
            />
            <span className="text-sm leading-6 text-muted">
              Quero receber novidades por e-mail. Opcional, e você pode sair quando quiser.
            </span>
          </label>

          {erro ? (
            <p role="alert" className="text-sm text-danger">
              {erro}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!podeEnviar}
            className="paper-control w-full rounded-control border border-primary bg-primary px-5 py-3 text-sm font-semibold text-primaryInk disabled:opacity-50"
          >
            {salvando ? "Salvando…" : "Continuar"}
          </button>

          <p className="text-xs leading-5 text-muted">
            Campos com <span className="text-danger">*</span> são obrigatórios. Não pedimos
            CPF agora — ele só é necessário para emitir a nota fiscal, se e quando você
            assinar.
          </p>
        </form>
      </main>
    </div>
  );
}
