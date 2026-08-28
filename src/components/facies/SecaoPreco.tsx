import { RotuloSecao } from "./RotuloSecao";

/**
 * Seção 06 da v7 — "preço".
 *
 * ⚠️⚠️ ESTE COMPONENTE EXISTE E **NÃO ESTÁ MONTADO**. Não montar sem checkout.
 *
 * O art. 30 do CDC vincula a oferta anunciada: preço na tela obriga a
 * sustentá-lo, e hoje não há como pagar. Enquanto o checkout não existir, esta
 * seção fica pronta e fora da página — construí-la agora custa pouco e evita
 * que ela seja improvisada no dia em que o pagamento entrar.
 *
 * ⚠️ OS VALORES DIVERGEM DO QUE FOI DECIDIDO ANTES, e a divergência não é minha
 * para resolver. A v7 traz R$ 396/ano (R$ 33/mês no Pix); a decisão de
 * monetização registrada fala em R$ 590/ano. São 194 reais de diferença no
 * plano principal. Ficaram os números da v7 porque a instrução foi seguir os
 * arquivos — mas antes de montar, alguém precisa dizer qual dos dois é o preço.
 *
 * ## Regras de forma que valem quando ela entrar
 *
 * - **Pílula só na etiqueta de economia**, que não é clicável. O botão de cada
 *   plano é retângulo em `--radius-control`. É a mesma regra do "grátis · sem
 *   cadastro" do topo.
 * - **O plano recomendado usa BORDA de 2px na cor da marca — nunca fundo
 *   diferente.** Fundo distinto faria o cartão ler como outra categoria de
 *   produto, e não como o mesmo produto recomendado.
 * - **O verbo do botão viaja com o nome**: quem clica em "Assinar anual" tem de
 *   chegar numa tela que diz "assinatura anual", não "checkout premium".
 */

type Plano = {
  nome: string;
  valor: string;
  unidade: string;
  economia?: string;
  cartao?: string;
  para: string;
  cta: string;
  recomendado?: boolean;
};

const PLANOS: Plano[] = [
  {
    nome: "Grátis, para sempre",
    valor: "R$ 0",
    unidade: "sem cartão, sem prazo",
    para:
      "A leitura completa de qualquer prova que já analisamos, o teste de 20 questões e o seu mapa. O resultado da nossa aposta também é aberto.",
    cta: "Começar sem cadastro",
  },
  {
    nome: "Mensal",
    valor: "R$ 49",
    unidade: "por mês, no cartão",
    para:
      "Para quem está na reta final e quer testar antes de se comprometer. Sem fidelidade — cancela em um clique.",
    cta: "Assinar mensal",
  },
  {
    nome: "Semestral",
    valor: "R$ 234",
    unidade: "no Pix · R$ 39 por mês",
    cartao: "No cartão: 6x de R$ 43 — total R$ 258.",
    economia: "R$ 24 mais barato no Pix",
    para: "Cobre um ciclo de prova inteiro sem comprometer o ano.",
    cta: "Assinar semestral",
  },
  {
    nome: "Anual",
    valor: "R$ 396",
    unidade: "no Pix · R$ 33 por mês",
    cartao: "No cartão: 12x de R$ 36,60 — total R$ 439.",
    economia: "R$ 43 mais barato no Pix",
    para: "O ciclo inteiro, com tudo o que for lançado durante o ano incluído.",
    cta: "Assinar anual",
    recomendado: true,
  },
];

const GARANTIAS = [
  "Reembolso integral em 7 dias, por lei e sem discussão",
  "Cancelamento em um clique — sem ligação e sem retenção",
  "Não vendemos conteúdo teórico e não prometemos aprovação",
];

export function SecaoPreco() {
  return (
    <section className="sec sec--sup">
      <div className="mx-auto w-full max-w-5xl px-[var(--gutter)]">
        <RotuloSecao numero="06">preço</RotuloSecao>
        <h2 className="mt-3 max-w-[22ch] font-serif font-semibold text-ink">
          Custa menos que a inscrição da prova.
        </h2>
        <p className="max-w-[62ch] text-base text-muted">
          No Pix o preço é menor porque o custo para nós é menor — não é promoção, é repasse.
          No cartão, o parcelamento sem juros é pago por nós, e o valor mostra isso.
        </p>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {PLANOS.map((plano) => (
            <div
              key={plano.nome}
              className={`flex flex-col rounded-surface bg-paper p-5 ${
                plano.recomendado ? "border-2 border-primary" : "border border-edge"
              }`}
            >
              <h3 className="paper-eyebrow">
                {plano.nome}
                {plano.recomendado ? " · recomendado" : ""}
              </h3>
              <p className="mt-3 font-mono text-3xl text-ink">{plano.valor}</p>
              <p className="mt-1 text-sm text-muted">{plano.unidade}</p>
              {plano.economia ? (
                <p className="mt-3">
                  {/* Pílula: etiqueta, não controle. */}
                  <span className="inline-flex items-center rounded-full border border-rule px-2.5 py-0.5 text-micro text-muted">
                    {plano.economia}
                  </span>
                </p>
              ) : null}
              <p className="mt-3 grow text-sm text-muted">{plano.para}</p>
              {plano.cartao ? <p className="mt-2 text-sm text-muted">{plano.cartao}</p> : null}
              <button
                type="button"
                className="mt-5 min-h-11 rounded-control border border-primary bg-primary px-4 text-sm font-semibold text-primaryInk"
              >
                {plano.cta}
              </button>
            </div>
          ))}
        </div>

        <ul className="mt-8 space-y-2 border-t border-rule pt-6 text-sm text-muted">
          {GARANTIAS.map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
