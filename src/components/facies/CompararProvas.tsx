import { nomeCurto, type Banca } from "@/lib/facies";

import { FaixaAreas } from "./FaixaAreas";
import {
  LIMIAR_EM_PONTOS,
  calcularDeltas,
  formatarDelta,
  percentualQuePedeIncorreta,
} from "./comparacaoDeProvas";

/**
 * "Comparar" — a terceira aba do `9a`.
 *
 * ## O desenho existe, e não estava onde eu procurei
 *
 * Eu tinha deixado esta aba de fora com uma justificativa escrita no código:
 * "'Comparar' aparece só como botão, em nenhum artboard com conteúdo". A
 * primeira metade é verdade — o `Webapp - telas` nomeia as três abas e desenha
 * duas. A conclusão não seguia.
 *
 * O artboard **B1 do `Instagram - modelos`** é exatamente esta tela, e é
 * específico:
 *
 *   > duas faixas empilhadas, mesma escala. A diferença aparece em âmbar e só
 *   > onde passa de 3 pontos.
 *
 * Com a **Regra 1b** do mesmo pacote dizendo o porquê: "a ordem das áreas é
 * fixa […] se a ordem mudar com a prova, a largura deixa de ser a única
 * variável e a comparação entre dois posts morre".
 *
 * A lição de método: "o desenho não decidiu" é uma afirmação sobre o pacote
 * INTEIRO, e eu a fiz depois de ler um arquivo dele. Um `grep` por "compar" nos
 * três `.dc.html` custou trinta segundos e derrubou a justificativa.
 *
 * ## Mesma escala sai de graça, e não é acidente
 *
 * As duas faixas são `FaixaAreas`, que distribui os segmentos por `flex-basis`
 * proporcional ao percentual. Como as duas somam ~100 — medido: entre 99,8 e
 * 100,2 nas 138 bancas —, a largura total é a mesma e cada posição é a mesma
 * área nas duas, que é literalmente o que a Regra 1b pede.
 *
 * A conta toda mora em `comparacaoDeProvas.ts`; aqui só se desenha.
 */

function StatDaProva({ banca }: { banca: Banca }) {
  return (
    <span className="font-mono text-nota tabular-nums text-muted">
      {percentualQuePedeIncorreta(banca).toFixed(0)}% pede a incorreta ·{" "}
      {banca.forma_recente.vinheta_pct.toFixed(0)}% vinheta longa
    </span>
  );
}

export function CompararProvas({ a, b }: { a: Banca; b: Banca }) {
  const deltas = calcularDeltas(a, b, nomeCurto(b));

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        {[a, b].map((banca, indice) => (
          <div key={banca.institution_key}>
            <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              {/* Nome curto: o institucional por extenso ocupa tres linhas
                  e repete-se em cada diferenca listada abaixo. */}
              <h3 className="font-mono font-medium text-ink">{nomeCurto(banca)}</h3>
              <StatDaProva banca={banca} />
            </div>
            {/* `rotulo` liga a faixa ao leitor de tela com os nomes por extenso
                e os percentuais na mesma ordem. Sem ele a comparação seria
                exclusivamente visual — duas barras coloridas e nada mais.

                A legenda vai só na SEGUNDA: a ordem é fixa e idêntica nas duas,
                então repetir os nomes ensinaria duas vezes a mesma chave e
                empurraria a comparação para baixo da dobra no celular. */}
            <FaixaAreas
              linhas={banca.areas.linhas}
              altura="leitura"
              rotulo={`Composição da ${nomeCurto(banca)}`}
              legenda={indice === 1}
            />
          </div>
        ))}
      </div>

      {deltas.length === 0 ? (
        /* O VAZIO É UM RESULTADO, e um resultado forte: duas provas que não
           diferem em mais de 3 pontos em nada cobram parecido. Uma tela em
           branco aqui leria como falha de carregamento. */
        <p className="max-w-[52ch] text-base text-muted">
          Nenhuma diferença passa de {LIMIAR_EM_PONTOS} pontos percentuais.
          Nessas medidas, {nomeCurto(a)} e {nomeCurto(b)} cobram parecido.
        </p>
      ) : (
        <div>
          <ul className="space-y-2">
            {deltas.map((delta) => (
              <li key={delta.chave} className="flex items-baseline gap-4">
                {/* `min-w-[4rem]`, e a largura é MEDIDA, não escolhida: a Azeret
                    Mono avança 15,61px por glifo em 24px (0,650 em, medido no
                    Chromium com o woff2 que o `next/font` empacota). O maior
                    conteúdo possível desta coluna é `+3,4` — a decimal só
                    aparece no limiar, então nunca há decimal com dois dígitos —
                    e ele ocupa 62,41px. Em `3.5rem` (56px) ele estourava e
                    empurrava a frase 6,4px para a direita só nas linhas com
                    decimal, desalinhando a coluna que o U+2212 existe para
                    manter reta. 4rem = 64px cobre os 62,41 com folga.

                    `text-warning`, e não um âmbar próprio: medido em 5,90:1
                    sobre a superfície clara e 6,49:1 sobre a escura, os dois
                    acima do 4,5:1 que texto exige. O `#B26A00` do artboard é da
                    escala do Instagram, onde o número tem 44px — aqui tem 22, e
                    número pequeno precisa de mais contraste, não menos. */}
                <span className="min-w-[4rem] shrink-0 text-right font-mono text-2xl tabular-nums text-warning">
                  {formatarDelta(delta.valor)}
                </span>
                <span className="text-base text-ink">{delta.frase}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 max-w-[52ch] text-nota text-muted">
            Só aparece o que passa de {LIMIAR_EM_PONTOS} pontos percentuais —
            abaixo disso a diferença cabe na variação entre edições da mesma
            prova.
          </p>
        </div>
      )}
    </div>
  );
}
