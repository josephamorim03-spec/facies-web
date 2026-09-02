import { MapaDaProva, type LinhaDoMapa } from "@/components/facies/MapaDaProva";
import { DIAS_DE_TRIAL, type DadosDaLanding } from "./dados";

/** Quantos assuntos a home mostra. O mesmo `NA_HOME` do `MapaDaProva`: os oito
 *  que decidem o estudo aqui, os quinze na página da prova. */
const NA_HOME = 8;

/**
 * O mapa — REUSANDO o componente, e não reimplementando.
 *
 * A peça em `web/design/` desenhou este mapa à mão (grade de 6 colunas densa,
 * tinta por incidência, filete da área à esquerda). Aqui ele é o `MapaDaProva`
 * de produção, com o mesmo mapeamento que o `ProvaReport` já faz.
 *
 * ⚠️ `n` é `total_serie`, a contagem CRUA. O `score` não entra na célula: ele é
 * peso, e exibi-lo ao lado de contagens seria a precisão fabricada que a página
 * recusa. Ele decide a ORDEM — daí `preOrdenado`.
 *
 * ## Duas coisas da peça que NÃO vieram, e por quê
 *
 * 1. **A aba "A prova e você".** O eixo do domínio só existe em `/mapa`, para
 *    quem tem conta: ele precisa de `dominio`, que vem de `competencyMastery`.
 *    Na peça era demonstração rotulada como tal; numa página real seria dado
 *    inventado.
 * 2. **Os três estados do artboard** (medido / estimado / não avaliado). O
 *    `MapaDaProva` não distingue medido de estimado, e `nao_avaliado` cai no piso
 *    de tinta — visualmente idêntico a "você vai muito bem aqui". Corrigir é
 *    mudar o componente de PRODUÇÃO, não este rascunho: fazer aqui criaria a
 *    segunda cópia, que é o defeito que `lib/areaIdentity.ts` já documenta.
 *
 * As duas estão em `LEIA-ME.md` e em `web/design/LEIA-ME.md`.
 */
export function MapaDosAssuntos({ dados }: { dados: DadosDaLanding }) {
  const { serie, prova } = dados;
  const correlatos = serie.anosCorrelatos.length;

  const celulas: LinhaDoMapa[] = serie.linhas.slice(0, NA_HOME).map((linha) => ({
    rotulo: linha.rotulo,
    n: linha.total_serie,
    exibivel: linha.exibivel,
    area: linha.area ?? null,
    serie: {
      valores: linha.serie,
      correlatos,
      // A composição impede que "25 questões" pareça inflado numa prova de uma
      // aplicação: diz de onde veio cada uma.
      nota: `${linha.diretas} desta prova · ${linha.correlatas} de provas parecidas`,
    },
  }));

  if (celulas.length === 0) return null;

  return (
    <section className="border-t border-rule bg-paper py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[1080px] px-5 sm:px-8">
        <div className="max-w-[66ch]">
          <h2 className="mb-4 max-w-[22ch] font-sans text-2xl font-semibold tracking-[-0.018em] sm:text-4xl">
            O que você ainda não viu
          </h2>
          <p>
            A fácies é da prova e é igual para todo mundo. O mapa é seu: cruza o que a prova cobra
            com o que você já mostrou saber. Cada célula é um assunto, o tamanho é o quanto a prova
            cobra aquilo — e a parte que decide o seu estudo é a que ainda está vazia.
          </p>
          <ol className="m-0 mt-5 list-none p-0" style={{ counterReset: "passo" }}>
            {[
              ["A fácies da prova.", "É o que você acabou de ler aqui em cima."],
              ["Um diagnóstico de 20 questões.", "Escolhidas pela fácies, não ao acaso."],
              [
                "O mapa, e o treino no que falta.",
                "O tamanho da célula é o quanto a prova cobra; a tinta passa a ser o que falta para você.",
              ],
            ].map(([forte, resto], i) => (
              <li
                key={forte}
                className="grid grid-cols-[auto_1fr] items-start gap-3.5 border-b border-rule py-3.5 first:border-t"
              >
                <span className="font-mono text-sm leading-relaxed text-marcaViva">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  <strong className="font-semibold">{forte}</strong> {resto}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <p className="mb-3 mt-6 font-mono text-micro text-muted">
          os {celulas.length} assuntos que mais voltam em {prova.sigla} · tamanho é incidência
        </p>
        <MapaDaProva linhas={celulas} preOrdenado />

        <div className="mt-8 max-w-[66ch]">
          <h3 className="mb-2 font-sans text-lg font-semibold">
            O que é grátis, e o que a assinatura acrescenta
          </h3>
          <p className="mb-4">
            Grátis, para sempre e sem cadastro: a fácies completa, as nove medidas, os trinta
            assuntos desta página e a nossa conta publicada depois da prova.
          </p>
          {/* ⚠️ AQUI A PÁGINA ESTAVA ERRADA, e errando contra si mesma.
              Dizia "com assinatura: o mapa e o plano" — mas `conceder_trial` é
              chamado no cadastro (`auth_accounts.py`), e a conta nasce podendo
              entrar. Cadastro grátis dá o mapa e o plano por `DIAS_DE_TRIAL`
              dias, sem cartão. Chamar isso de "assinatura" esconde o maior ativo
              de conversão que o produto tem hoje.

              ⚠️ SEM CIFRA continua valendo, por decisão de 23/08: oferta vincula
              (CDC art. 30) e o checkout não abriu. Um teste gratuito que funciona
              de verdade não é oferta de venda — é uma coisa que a pessoa obtém
              agora —, então anunciá-lo é seguro e exato.

              ⚠️ O NÚMERO vem de `app/repos/entitlement_repo.py:60`
              (`DIAS_DE_TRIAL`). `verificar-landing-v8.mjs` lê a constante e
              reprova se divergirem: `web/src/lib/accessLapse.ts` ainda diz
              "14 dias", e é exatamente esse tipo de número em comentário que o
              repositório já documenta como afirmação com prazo de validade. */}
          <p className="mb-4">
            Com cadastro, de graça e sem cartão: o mapa e o plano por{" "}
            <span className="font-mono tabular-nums">{DIAS_DE_TRIAL}</span> dias.
          </p>
          <p>
            Depois disso, assinatura. Ela ainda não abriu — quando abrir, o preço estará escrito
            aqui antes de qualquer cobrança.
          </p>
        </div>
      </div>
    </section>
  );
}
