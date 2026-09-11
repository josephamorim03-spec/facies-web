"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  CAMINHO_EXPORTACAO,
  encerrarTodasAsSessoes,
  excluirConta,
  listarSessoes,
  type SessaoAtiva,
} from "@/lib/api/domains/account";
import { me as buscarMe } from "@/lib/api/domains/starter";
import { getProfile, type UserProfile } from "@/lib/api/domains/study-import";
import { LoadBar } from "@/components/ui/LoadBar";
import { ContaSection } from "@/app/preferencias/_components/ContaSection";
import { SecaoAcesso } from "./_components/SecaoAcesso";
import { SecaoSenha } from "./_components/SecaoSenha";

/**
 * A conta do titular: sessões e direitos de LGPD.
 *
 * O backend de exportação e exclusão existe desde sempre e **nunca teve tela** —
 * `GET /account/export` e `POST /account/delete` só apareciam no schema gerado.
 * Direito que só se exerce por `curl` não é direito exercível, e a LGPD pede
 * meio para exercê-lo (art. 18), não a mera existência da rota.
 *
 * O que esta tela AINDA NÃO tem, e por quê: histórico de versões de termos
 * aceitas, revogação de consentimento de marketing, e contato do encarregado.
 * Os três dependem de documentos e de um DPO designado, que não existem — e
 * inventar um "Encarregado: —" seria pior que a ausência.
 */

function formatarData(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function ContaPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);
  const [sessoes, setSessoes] = useState<SessaoAtiva[] | null>(null);
  const [perfil, setPerfil] = useState<UserProfile | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [emailDigitado, setEmailDigitado] = useState("");

  const carregar = useCallback(async () => {
    try {
      // O perfil entra na MESMA rodada: em serie ele adiaria a tela inteira
      // por uma consulta que nao decide se ha' tela.
      const [eu, lista, meuPerfil] = await Promise.all([
        buscarMe(""),
        listarSessoes(),
        // O acesso e' informativo: se so' ele falhar, a Conta continua servindo
        // sessoes, senha e os direitos de LGPD — que sao o motivo de esta tela
        // ficar FORA do portao de acesso.
        getProfile("").catch(() => null),
      ]);
      setEmail(eu.email ?? null);
      setSessoes(lista.sessions);
      setPerfil(meuPerfil);
    } catch {
      router.replace("/login");
    } finally {
      setCarregando(false);
    }
  }, [router]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function encerrarSessoes() {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    setAviso(null);
    try {
      const { revoked } = await encerrarTodasAsSessoes();
      setAviso(
        `${revoked} ${revoked === 1 ? "sessão encerrada" : "sessões encerradas"}. ` +
          "Você vai precisar entrar de novo neste dispositivo também.",
      );
      setSessoes([]);
    } catch {
      setErro("Não consegui encerrar as sessões agora.");
    } finally {
      setOcupado(false);
    }
  }

  async function confirmarExclusao() {
    if (ocupado) return;
    setOcupado(true);
    setErro(null);
    try {
      await excluirConta(emailDigitado.trim());
      // A conta não autentica mais a partir daqui: sair para a Fácies pública.
      window.location.href = "/";
    } catch {
      setErro("Não excluí. O e-mail precisa ser exatamente o da conta.");
      setOcupado(false);
    }
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="w-full max-w-xs">
          <LoadBar label="Carregando sua conta" />
          <p className="paper-eyebrow mt-2">Carregando</p>
        </div>
      </div>
    );
  }

  const emailConfere =
    !!email && emailDigitado.trim().toLowerCase() === email.trim().toLowerCase();

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <span className="paper-eyebrow">Sua conta</span>
      <h1 className="mt-3 font-serif font-semibold text-ink">Conta e privacidade</h1>
      <p className="mt-2 text-sm text-muted">{email ?? "—"}</p>

      {erro ? <p className="mt-4 text-sm text-danger">{erro}</p> : null}
      {aviso ? <p className="mt-4 text-sm text-success">{aviso}</p> : null}

      <SecaoAcesso
        status={perfil?.access_status ?? null}
        expiraEm={perfil?.access_expires_at}
      />

      {/* ── Segurança ──────────────────────────────────────────────────── */}
      <section className="mt-8 rounded-surface border border-edge bg-surface p-5 sm:p-6">
        <h2 className="font-serif font-semibold text-ink">Sessões ativas</h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          Cada sessão é um navegador onde você entrou e continua conectado. Não mostramos
          dispositivo nem localização porque não guardamos esses dados — só as datas.
        </p>

        {sessoes && sessoes.length > 0 ? (
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {sessoes.map((s) => (
              <li key={s.session_id} className="flex flex-wrap gap-x-6 gap-y-1 py-3 text-sm">
                <span className="text-ink">Aberta em {formatarData(s.created_at)}</span>
                <span className="text-muted">
                  Último uso: {formatarData(s.last_used_at ?? s.created_at)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">Nenhuma sessão ativa além desta.</p>
        )}

        <button
          type="button"
          onClick={encerrarSessoes}
          disabled={ocupado}
          className="paper-control mt-4 inline-flex rounded-control border border-edge bg-surfaceMuted px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
        >
          Encerrar todas as sessões
        </button>
        <p className="mt-2 text-xs text-muted">
          Inclui esta. Use se suspeitar que alguém entrou na sua conta.
        </p>
      </section>

      <SecaoSenha />

      {/* ── Seus dados ─────────────────────────────────────────────────── */}
      <section className="mt-6 rounded-surface border border-edge bg-surface p-5 sm:p-6">
        <h2 className="font-serif font-semibold text-ink">Seus dados</h2>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          Baixe tudo o que guardamos sobre você em um arquivo JSON: perfil, respostas,
          revisões, anotações e histórico. Senhas e tokens nunca entram na exportação.
        </p>
        {/* Navegação direta, não `fetch`: o navegador precisa receber o
            Content-Disposition para salvar o arquivo. */}
        <a
          href={CAMINHO_EXPORTACAO}
          className="paper-control mt-4 inline-flex rounded-control border border-edge bg-surfaceMuted px-4 py-2 text-sm font-medium text-ink"
        >
          Exportar meus dados
        </a>
      </section>

      {/* ── Encerrar a conta ───────────────────────────────────────────────
          DISCRETA, E NAO ESCONDIDA — a distincao e o ponto inteiro desta seção.

          Ela era um cartao com borda de perigo, no mesmo peso visual de "Sessões
          ativas" e "Seus dados": coisas que o titular usa de vez em quando, ao
          lado de uma acao IRREVERSIVEL que ele usa no maximo uma vez. Peso igual
          para consequencias tao diferentes convida ao toque errado, e ainda faz
          a tela inteira parecer perigosa.

          ⚠️ NAO PODE SUMIR. Este arquivo ja registra o motivo: a LGPD pede MEIO
          para exercer o direito (art. 18), e "direito que so' se exerce por
          curl nao e' direito exercivel". Entao ela continua nesta pagina, a UM
          toque, com o rotulo escrito — o que muda e' que ela parou de disputar
          atencao com o que se usa todo mes.

          ⚠️ E NAO CONFUNDIR COM CANCELAR ASSINATURA. O artboard `12c` manda o
          cancelamento ter o MESMO peso de "Baixar as suas respostas", e essa
          regra continua valendo quando o cancelamento existir: ele e' reversivel
          e a empresa tem interesse em esconde-lo. Apagar a conta e' o contrario:
          irreversivel, e o interesse de esconder nao existe.

          `<details>` nativo: sem estado em React, com foco de teclado e
          expansao por Enter de graca. */}
      <details className="mt-8 border-t border-rule pt-4">
        <summary className="paper-control flex min-h-11 cursor-pointer list-none items-center justify-between text-sm text-muted hover:text-ink">
          <span>Encerrar a conta</span>
          <span aria-hidden="true" className="transition">›</span>
        </summary>
        <p className="mt-3 max-w-[62ch] text-sm text-muted">
          Apaga seu perfil, progresso, anotações e sessões, e bloqueia o acesso. É
          irreversível. O registro de auditoria da exclusão é mantido, porque é ele que
          prova que você pediu.
        </p>

        {confirmandoExclusao ? (
          <div className="mt-4">
            <label htmlFor="confirmar-email" className="paper-eyebrow block pb-1">
              Digite {email} para confirmar
            </label>
            <input
              id="confirmar-email"
              value={emailDigitado}
              onChange={(e) => setEmailDigitado(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              className="paper-control w-full max-w-sm rounded-control border border-edge bg-surface px-3 py-2 text-sm text-ink"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={confirmarExclusao}
                disabled={ocupado || !emailConfere}
                className="paper-control rounded-control border border-danger bg-danger px-4 py-2 text-sm font-medium text-ink disabled:opacity-40"
              >
                Excluir definitivamente
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmandoExclusao(false);
                  setEmailDigitado("");
                }}
                disabled={ocupado}
                className="paper-control rounded-control border border-edge bg-surface px-4 py-2 text-sm text-ink disabled:opacity-40"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmandoExclusao(true)}
            className="paper-control mt-4 inline-flex rounded-control border border-edge bg-surface px-4 py-2 text-sm text-danger"
          >
            Excluir a conta
          </button>
        )}
      </details>

      {/* Tema e sair da conta.
          ⚠️ ELES MORAVAM EM `/preferencias`, e o motivo era bom: a `SidebarNav`
          renderiza `null` sem desktop, então no celular estas duas coisas só
          existiam dentro dela — o aluno ficava preso na conta. O motivo caducou
          quando `/conta` virou aba da barra, alcançável com o polegar. E aqui
          é o lugar certo dos dois de qualquer forma: `/preferencias` passou a
          ser só a rotina, e tema e logout não são rotina. */}
      <div className="mt-8">
        <ContaSection />
      </div>
    </main>
  );
}
