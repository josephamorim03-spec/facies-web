import type { Banca } from "@/lib/facies";
import { formatosDistintivos, NACIONAL, TOTAL_BANCAS } from "@/lib/facies";
import { dec } from "@/lib/decimal";

/**
 * Como esta banca monta a questão — e SÓ quando isso a distingue.
 *
 * ## Por que o painel voltou
 *
 * Ele existiu, dizia coisas como "4 alternativas por questão" e "19% pedem a
 * alternativa incorreta", e eu o removi por não mudar o que ninguém estuda.
 * Estava certo sobre aquele conteúdo e errado sobre o painel: o problema não era
 * falar de formato, era falar de formato SEM CRITÉRIO.
 *
 * "Tem 4 alternativas" é ficha técnica — verdadeiro, e a pessoa descobre no
 * primeiro minuto de prova. "Cobra certo/errado em 93% das questões, contra 5%
 * na média" é outra coisa inteiramente: é a diferença mais forte que existe
 * entre bancas, é exata (não é estimativa) e muda o treino de quem vai prestar.
 *
 * ## O critério já existia, e não é novo
 *
 * `formatoDistintivo` combina intervalo de Wilson com tamanho de efeito (Cohen
 * h): a linha só aparece quando a diferença contra a média nacional é grande o
 * bastante E a base da banca sustenta a afirmação. É o mesmo portão que o cartão
 * de OpenGraph usa, então o que circula em print e o que está na página não
 * podem divergir.
 *
 * Medido no acervo: 89 das 141 bancas têm ao menos um formato distintivo. As
 * outras 52 não recebem um painel vazio — recebem a frase que diz que seguir o
 * padrão também é informação.
 *
 * ## A frase é comparativa, sempre
 *
 * Um percentual sozinho não informa: ninguém sabe se 12% de "pede a incorreta" é
 * muito. O que informa é o par — 12% aqui, 14% na média — e a direção. Por isso
 * nenhuma linha aparece sem o seu denominador ao lado, que é a mesma regra do
 * painel de área.
 */
/**
 * Piso de RELEVÂNCIA, por cima do piso estatístico.
 *
 * `formatoDistintivo` responde "esta diferença é real?" — Wilson mais tamanho de
 * efeito. Ele não responde "esta diferença IMPORTA?", e as duas perguntas se
 * separam no rodapé da distribuição.
 *
 * O caso que expôs isso: a USP saiu com "verdadeiro/falso em 0% das questões,
 * a média é 0,6%". Estatisticamente correto e completamente inútil — quase
 * nenhuma banca usa esse formato, então não usá-lo não distingue ninguém e não
 * muda o treino de ninguém. Era a versão nova do "tem 4 alternativas".
 *
 * A regra: pelo menos UM dos lados precisa alcançar 3% para a linha existir. Não
 * substitui o teste estatístico, soma-se a ele.
 */
const PISO_RELEVANCIA = 3;

export function ComoCobra({ banca }: { banca: Banca }) {
  const distintivos = formatosDistintivos(banca).filter(
    (linha) =>
      Math.max(linha.pct, NACIONAL.formato_pct[linha.codigo] ?? 0) >=
      PISO_RELEVANCIA,
  );

  if (distintivos.length === 0) {
    return (
      <p className="max-w-[62ch] text-base text-muted lg:text-lg">
        No formato das questões esta banca segue o padrão das demais — e isso é
        informação: não há pegadinha de enunciado para treinar aqui, e o preparo
        se decide pelo conteúdo.
      </p>
    );
  }

  return (
    <div className="grid gap-4">
      {distintivos.map((linha) => {
        const media = NACIONAL.formato_pct[linha.codigo] ?? 0;
        const acima = linha.pct > media;
        // Quantas vezes a média, quando ela não é perto de zero. Com média
        // minúscula a razão explode ("18 vezes") e informa menos que a diferença
        // crua, então o múltiplo só entra quando os dois lados têm corpo.
        //
        // ⚠️ A RAZÃO INVERTE conforme a direção. `pct / media` vale para "cobra
        // mais"; para "cobra menos" o mesmo cálculo dá 0,1 e a frase sairia
        // "cobra 0,1 vezes menos", que não quer dizer nada. Quem cobra menos é
        // descrito pelo inverso: a média é N vezes esta prova.
        const multiplo =
          media >= 2 && linha.pct >= 2
            ? acima
              ? linha.pct / media
              : media / linha.pct
            : null;

        return (
          <div key={linha.codigo} className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
            <p className="max-w-[62ch] text-base text-ink lg:text-lg">
              <b className="font-semibold">{linha.rotulo}</b> em{" "}
              <span className="tabular-nums">{linha.pct.toFixed(0)}%</span> das questões
              {acima ? "" : " — bem menos que as outras"}.
            </p>
            <p className="mt-1 max-w-[62ch] text-sm text-muted">
              A média das {TOTAL_BANCAS} bancas é{" "}
              <span className="tabular-nums">{dec(media)}%</span>
              {multiplo
                ? `, ou seja, esta prova cobra ${dec(multiplo)} vez${
                    multiplo >= 2 ? "es" : ""
                  } ${acima ? "mais" : "menos"}`
                : ""}
              .
            </p>
          </div>
        );
      })}

      <p className="mt-1 max-w-[62ch] text-sm text-muted">
        Só aparecem os formatos em que esta banca se afasta das demais com margem
        que a base dela sustenta. O resto ela faz como todo mundo.
      </p>
    </div>
  );
}
