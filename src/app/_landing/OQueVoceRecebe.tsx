import { DIAS_DE_TRIAL } from "./dados";

/**
 * O que você recebe — os três níveis, sem letra miúda.
 *
 * Consolida o que a v8 espalhava em `MapaDosAssuntos` e `Objecoes`: o grátis
 * para sempre, o cadastro de 30 dias e a assinatura futura. A seção de preço
 * completa (`SecaoPreco`) continua desmontada de propósito: sem checkout,
 * anunciar tabela de preços vincula a oferta (CDC art. 30).
 *
 * ⚠️ O "R$ 490 no primeiro ano" é decisão do operador de 30/08 (posterior ao
 * "sem cifra" de 23/08). É oferta vinculante: subir o valor exige que esta
 * página deixe de prometê-lo ANTES. `verificar-landing-v8.mjs` exige a cifra
 * literal nesta pasta — por isso ela está escrita aqui, não interpolada.
 *
 * ⚠️ O trial não é digitado: `DIAS_DE_TRIAL` vem de `dados.ts`, que o
 * verificador amarra a `app/repos/entitlement_repo.py`.
 */

function garantias(dias: number): string[] {
  return [
    "A leitura da sua prova é gratuita, para sempre e sem cadastro.",
    `O cadastro grátis não pede cartão e vale por ${dias} dias.`,
    "Não vendemos conteúdo teórico — o que medimos serve para decidir onde aplicar o material que você já tem.",
    "Não prometemos aprovação.",
    "Avisamos antes de qualquer cobrança, e ninguém é cobrado sem contratar.",
  ];
}

export function OQueVoceRecebe() {
  return (
    <section id="o-que-voce-recebe" className="border-t border-rule bg-paper py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[1080px] px-[var(--gutter)]">
        <div className="max-w-[66ch]">
          <span className="paper-eyebrow">o que você recebe</span>
          <h2 className="mt-3 mb-4 max-w-[24ch] font-sans font-semibold">
            Três níveis, nenhum pede cartão para começar.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="flex flex-col rounded-surface border border-rule bg-surface p-5 sm:p-6">
            <h3 className="paper-eyebrow">grátis · para sempre</h3>
            <p className="mt-3 grow text-base">
              A leitura completa da sua prova — a fácies, as nove medidas, os assuntos mais
              prováveis, o ebook da revisão final e a nossa conta publicada depois da prova.
            </p>
            <p className="mt-3 text-sm text-muted">sem cadastro · sem cartão</p>
          </div>

          <div className="flex flex-col rounded-surface border border-rule bg-surface p-5 sm:p-6">
            <h3 className="paper-eyebrow">cadastro grátis · {DIAS_DE_TRIAL} dias</h3>
            <p className="mt-3 grow text-base">
              O mapa da prova e o plano de estudo por{" "}
              <span className="font-mono tabular-nums">{DIAS_DE_TRIAL}</span> dias. Sem cobrança,
              sem cartão — e você decide depois.
            </p>
            <p className="mt-3 text-sm text-muted">a conta nasce com acesso, sem cartão</p>
          </div>

          <div className="flex flex-col rounded-surface border border-rule bg-surface p-5 sm:p-6">
            <h3 className="paper-eyebrow">assinatura · em breve</h3>
            <p className="mt-3 grow text-base">
              As assinaturas ainda não abriram. Quem se cadastrar agora paga{" "}
              <span className="text-ink">R$ 490 no primeiro ano</span>, em vez de R$ 590. Avisamos
              antes de abrir.
            </p>
            <p className="mt-3 text-sm text-muted">ninguém é cobrado sem contratar</p>
          </div>
        </div>

        <ul className="mt-8 space-y-2 border-t border-rule pt-6 text-sm text-muted">
          {garantias(DIAS_DE_TRIAL).map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
