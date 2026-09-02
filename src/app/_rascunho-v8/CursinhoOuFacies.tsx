import type { DadosDaLanding } from "./dados";

/**
 * A âncora, e por que ela mudou de lugar.
 *
 * A v7 comparava com BANCO DE QUESTÕES, e `docs/product/positioning.md:80-95`
 * registra o custo: ancora o produto contra banco de R$29,90 em vez de contra a
 * mentoria de R$500. Quem já faz previsão de prova é o cursinho — e é ali que o
 * valor aparece.
 *
 * Cada linha da coluna da direita é verificável na própria página: a data e o
 * hash estão no bloco dos trinta, o erro fora de amostra está no Métodos, e o
 * "sem cadastro" é o próprio funcionamento da página. A objeção do banco de
 * questões não some — ela vira a linha de fecho, que é o tamanho que merece.
 */
export function CursinhoOuFacies({ dados }: { dados: DadosDaLanding }) {
  const { previsao, forma, prova } = dados;
  const erroPp = 3.5; // forma.json → metodo.erro_medido_pp

  return (
    <section className="border-t border-rule py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[1080px] px-5 sm:px-8">
        <div className="max-w-[66ch]">
          <h2 className="mb-4 max-w-[22ch] font-sans text-2xl font-semibold tracking-[-0.018em] sm:text-4xl">
            Cursinho também prevê prova. A diferença é a conta.
          </h2>
          <p>
            Prever é a parte que todo mundo faz. O que ninguém faz é fechar a lista antes, com
            data e código, e publicar depois quanto errou.
          </p>
        </div>

        <div className="mt-2 grid grid-cols-1 gap-x-10 gap-y-2 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 mt-5 font-sans text-lg font-semibold">Uma previsão de cursinho</h3>
            <ul className="m-0 list-none p-0">
              {[
                "Sai quando o cursinho quiser, sem data de fechamento",
                "Vale pela autoridade de quem ensina",
                "Não volta depois da prova para prestar contas",
                "Chega junto com a matrícula",
              ].map((t) => (
                <li key={t} className="border-b border-rule py-2.5 text-base first:border-t">
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-2 mt-5 font-sans text-lg font-semibold">A Fácies</h3>
            <ul className="m-0 list-none p-0">
              <li className="border-b border-rule py-2.5 text-base first:border-t">
                Fechou a lista em{" "}
                <span className="font-mono tabular-nums">{previsao?.registradoEm ?? "—"}</span>, com
                código que você confere
              </li>
              <li className="border-b border-rule py-2.5 text-base">
                Vale pela medição: questão por questão, erro declarado em{" "}
                <span className="font-mono tabular-nums">{erroPp.toLocaleString("pt-BR")} pp</span>
              </li>
              <li className="border-b border-rule py-2.5 text-base">
                Publica a conta depois: quantos dos{" "}
                <span className="font-mono tabular-nums">{previsao?.itens.length ?? 30}</span>{" "}
                caíram, e quais não
              </li>
              <li className="border-b border-rule py-2.5 text-base">
                Está aberta agora, de graça e sem cadastro
              </li>
            </ul>
          </div>
        </div>

        <p className="mt-6 max-w-[60ch] border-l-2 border-marcaViva pl-4 text-base">
          Também não somos banco de questões: se o que falta é volume, existem bancos gratuitos e
          bons — use um, e use a Fácies junto. E não vendemos conteúdo teórico. O que medimos serve
          para decidir onde aplicar o material que você já tem.
        </p>

        {/* O `n` do formato fica aqui de propósito: é a única afirmação desta
            seção que depende de medição, e ela tem de carregar a base junto. */}
        <p className="sr-only">
          Base do formato: {forma.base.n} {forma.base.do_que} da família de {prova.sigla}.
        </p>
      </div>
    </section>
  );
}
