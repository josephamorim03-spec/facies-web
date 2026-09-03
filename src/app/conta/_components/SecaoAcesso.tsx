import Link from "next/link";

/**
 * O estado do acesso, dito uma vez e sem cifra.
 *
 * O artboard `12c` desenha uma assinatura ativa ("Anual no Pix · R$ 396"), e
 * essa tela NÃO pode existir hoje: não há checkout, não há meio de pagamento
 * guardado e os Termos vigentes dizem, na seção 4.1, que *"nenhum recurso da
 * Fácies é cobrado neste momento"*. Desenhar o bloco de assinatura do artboard
 * seria anunciar oferta de algo incompravel — o mesmo motivo que tirou o preço
 * da home em agosto (CDC, art. 30).
 *
 * Então o bloco existe com o conteúdo VERDADEIRO: quanto tempo de acesso
 * completo resta, e a promessa que o sistema já cumpre — nada é cobrado sem
 * contratação. A frase é a mesma de `AvisoFimDeAcesso`, de propósito: duas
 * superfícies dizendo a mesma coisa com palavras diferentes é como o aluno
 * descobre que uma delas está desatualizada.
 *
 * ⚠️ Quando o checkout existir, é AQUI que a assinatura entra — com o
 * cancelamento no mesmo peso visual, que é o que os Termos prometem ("em
 * /conta, sem ligação e sem falar com ninguém") e o que o `12c` desenha.
 */

function porExtenso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return null;
  return data.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function SecaoAcesso({
  status,
  expiraEm,
}: {
  status: "active" | "expired" | "inactive" | null;
  expiraEm: string | null | undefined;
}) {
  const vence = porExtenso(expiraEm);
  const ativo = status === "active";

  return (
    <section className="mt-8 rounded-surface border border-edge bg-surface p-5 sm:p-6">
      <h2 className="font-serif text-lg font-semibold text-ink">Seu acesso</h2>

      {ativo ? (
        <p className="mt-2 max-w-[62ch] text-sm leading-6 text-ink">
          {vence ? (
            <>
              Acesso completo até <strong className="font-semibold">{vence}</strong>, por
              nossa conta.
            </>
          ) : (
            "Acesso completo, por nossa conta."
          )}
        </p>
      ) : (
        <p className="mt-2 max-w-[62ch] text-sm leading-6 text-ink">
          {status === "expired"
            ? "Sua avaliação terminou. Sua conta continua sua: o progresso, as preferências e os dados ficam onde estão."
            : "Seu acesso ao app não está ativo no momento."}
        </p>
      )}

      <p className="mt-2 max-w-[62ch] text-sm leading-6 text-muted">
        As assinaturas ainda não abriram — avisamos você antes, e nada é cobrado sem você
        contratar. Não pedimos cartão e não guardamos meio de pagamento.
      </p>

      <p className="mt-4 text-sm text-muted">
        <Link href="/termos" className="text-marca underline underline-offset-4">
          Termos de uso
        </Link>
        <span className="px-2 text-rule">·</span>
        <Link href="/privacidade" className="text-marca underline underline-offset-4">
          Política de privacidade
        </Link>
      </p>
    </section>
  );
}
