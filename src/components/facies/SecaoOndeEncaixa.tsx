import { RotuloSecao } from "./RotuloSecao";
import { CONT_LANDING } from "@/lib/site";

/**
 * Seção 04 da v7 — "onde isto se encaixa".
 *
 * ## Por que esta seção é a mais importante da página para não parecer mentira
 *
 * O leitor chega achando que isto é banco de questões, porque é o que existe no
 * mercado. Enquanto ele achar isso, cada frase da página é lida como exagero de
 * um banco pior. A seção não vende: ela DESFAZ uma categoria errada.
 *
 * E ela faz isso da única forma que convence um cético — recomendando o
 * concorrente. A última linha manda usar um banco gratuito, e é a frase que
 * mais custa da página inteira. É também a que passa nos três testes do guia de
 * texto: é verdade hoje, um cético diria "prova", e alguém falaria isso em voz
 * alta no corredor.
 *
 * ⚠️ NÃO transformar em tabela comparativa com ✓ e ✗. A v7 usa duas listas
 * lado a lado de propósito: a tabela com marcas de certo e errado transforma
 * "coisas diferentes" em "um é melhor", que é exatamente a leitura que esta
 * seção existe para evitar. O banco de questões não está errado; ele responde
 * outra pergunta.
 */

const BANCO = [
  "Muita questão — dezenas de milhares",
  "Filtro por prova, ano e tema",
  "Comentário da alternativa",
  "Seu percentual de acerto por área",
];

export function SecaoOndeEncaixa() {
  return (
    <section className="sec sec--sup">
      <div className={CONT_LANDING}>
        <RotuloSecao numero="04">onde isto se encaixa</RotuloSecao>
        <h2 className="mt-3 max-w-[20ch] font-serif font-semibold text-ink">
          Isto não é mais um banco de questões.
        </h2>

        <div className="mt-8 grid gap-8 md:grid-cols-2">
          <div>
            <h3 className="font-serif font-semibold text-ink">Um banco de questões dá</h3>
            <ul className="mt-4 space-y-3">
              {BANCO.map((linha) => (
                <li
                  key={linha}
                  className="border-l-2 border-rule pl-3 text-base text-muted"
                >
                  {linha}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-serif font-semibold text-ink">O Fácies dá</h3>
            <ul className="mt-4 space-y-3">
              {/* O filete da esquerda muda de cor, e é o único sinal de
                  contraste entre as duas colunas. Sem ✓/✗, sem fundo, sem
                  negrito: a diferença é de assunto, não de qualidade. */}
              <li className="border-l-2 border-primary pl-3 text-base text-ink">
                Como a sua prova é feita, medida por medida
              </li>
              <li className="border-l-2 border-primary pl-3 text-base text-ink">
                Os assuntos exatos que ela repete, e os que estão crescendo
              </li>
              <li className="border-l-2 border-primary pl-3 text-base text-ink">
                O que <em className="not-italic font-semibold">você</em> ainda não viu — e o
                quanto disso vale na prova
              </li>
              <li className="border-l-2 border-primary pl-3 text-base text-ink">
                Um plano que encolhe no dia de plantão em vez de virar dívida
              </li>
            </ul>
          </div>
        </div>

        {/* A frase que recomenda o concorrente. Fica sobre superfície lisa e
            sem cartão: emoldurá-la a transformaria em peça de marketing, que é
            o oposto do que ela faz. */}
        <p className="mt-8 max-w-[62ch] border-t border-rule pt-6 text-base text-muted">
          Se o que falta para você é volume de questões, existem bancos gratuitos e bons.
          Use um — e use o Fácies junto. Não somos um banco maior. Somos a leitura da prova
          que nenhum deles faz.
        </p>
      </div>
    </section>
  );
}
