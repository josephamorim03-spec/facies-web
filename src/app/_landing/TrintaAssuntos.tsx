import type { DadosDaLanding } from "./dados";

/**
 * A série por assunto — uma barra por aplicação.
 *
 * ⚠️ DUPLICAÇÃO CONSCIENTE, E QUE NÃO PODE SOBREVIVER À PROMOÇÃO.
 *
 * Isto reproduz o `Serie` de `components/facies/MapaDaProva.tsx`, que hoje é
 * `function Serie` sem `export`. Ao promover este rascunho, o certo é exportar o
 * de lá (uma palavra) e apagar este — manter dois é exatamente o defeito que
 * `lib/areaIdentity.ts` já documenta uma vez, quando um `AREA_HEX` paralelo fez
 * GO sair `#7B0F6B` num gráfico e `#8F3F7D` noutro, na mesma sessão.
 *
 * As regras vêm de lá: correlatas finas em cinza a 40%, a edição própria grossa
 * em petróleo, traço de 1px entre as duas, 24px de altura com piso de 3px para a
 * barra zerada não sumir.
 */
function Serie({ valores, correlatos }: { valores: number[]; correlatos: number }) {
  const maximo = Math.max(1, ...valores);
  return (
    <span className="flex h-6 items-end gap-[2px]" aria-hidden>
      {valores.map((valor, indice) => (
        <span key={indice} className="flex items-end">
          {indice === correlatos ? (
            <span className="mr-[3px] h-6 w-px self-stretch bg-edge" />
          ) : null}
          <span
            className={indice >= correlatos ? "w-2 bg-primary" : "w-[5px] bg-muted opacity-40"}
            style={{ height: `${Math.max(3, (valor / maximo) * 24)}px` }}
          />
        </span>
      ))}
    </span>
  );
}

/** Quantos assuntos trazem o valor. Os outros vinte entram só como rótulo — a
 *  lista inteira é a carga, mas trinta linhas com número viram tabela. */
const COM_VALOR = 10;

export function TrintaAssuntos({ dados }: { dados: DadosDaLanding }) {
  const { previsao, serie } = dados;
  if (!previsao || previsao.itens.length === 0) return null;

  const porRotulo = new Map(serie.linhas.map((l) => [l.rotulo, l]));
  const correlatos = serie.anosCorrelatos.length;
  const primeiroAno = serie.anosCorrelatos[0];
  const ultimoAno = serie.anosDiretos[serie.anosDiretos.length - 1];

  const comValor = previsao.itens.slice(0, COM_VALOR);
  const resto = previsao.itens.slice(COM_VALOR);

  return (
    <section className="border-t border-rule py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[1080px] px-[var(--gutter)]">
        <div className="max-w-[66ch]">
          <h2 className="mb-4 max-w-[22ch] font-sans font-semibold">
            Todo mundo diz o que vai cair. Depois.
          </h2>
          <p className="mb-4">
            Nós dissemos antes. Estes{" "}
            <span className="font-mono tabular-nums">{previsao.itens.length}</span> assuntos foram
            fechados em <span className="font-mono tabular-nums">{previsao.registradoEm}</span>, com
            data e código de verificação, e estão aqui inteiros — não atrás de cadastro.
          </p>
          {/* O hash é o artefato que torna a aposta falsificável. Dizer que existe
              e não mostrá-lo é pedir fé. */}
          <p className="m-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            <span className="font-mono text-micro text-muted">registro sha-256</span>
            <code className="break-all rounded-control bg-surface px-1.5 py-0.5 font-mono text-micro text-ink">
              {previsao.hash}
            </code>
          </p>
        </div>

        <p className="mb-2 mt-6 font-mono text-micro text-muted">
          uma barra por aplicação, de {primeiroAno} a {ultimoAno} · a última, em petróleo, é a
          edição própria; as cinzas são as provas que ela substituiu
        </p>

        <ol className="m-0 max-w-[58ch] list-none p-0">
          {comValor.map((item) => {
            const linha = porRotulo.get(item.rotulo);
            return (
              <li
                key={item.rotulo}
                className="grid grid-cols-[2ch_1fr_auto] items-baseline gap-x-2.5 gap-y-0.5 border-b
                  border-rule py-2.5 first:border-t sm:grid-cols-[2ch_1fr_auto_auto] sm:items-center sm:gap-4"
              >
                <span className="text-right font-mono text-sm tabular-nums text-muted">
                  {item.posicao}
                </span>
                <span className="text-base">{item.rotulo}</span>
                {linha?.serie ? (
                  <span className="col-span-full row-start-2 mt-1 sm:col-auto sm:row-auto sm:mt-0">
                    <Serie valores={linha.serie} correlatos={correlatos} />
                  </span>
                ) : (
                  <span className="hidden sm:block" />
                )}
                <span className="text-right font-mono text-sm font-medium tabular-nums">
                  {/* `score` é soma ponderada, não contagem — o tipo diz isso, e a
                      página não pode chamá-lo de "questões". */}
                  {item.score.toLocaleString("pt-BR")}
                </span>
                {linha ? (
                  <span className="sr-only">
                    {linha.diretas} na edição própria e {linha.correlatas} nas provas que ela
                    substituiu, somando {linha.total_serie}.
                  </span>
                ) : null}
              </li>
            );
          })}
        </ol>

        <ul className="m-0 mt-4 max-w-[66ch] list-none p-0 text-sm text-muted">
          {resto.map((item, i) => (
            <li key={item.rotulo} className="inline">
              <span className="font-mono">{item.posicao}</span> {item.rotulo}
              {i < resto.length - 1 ? " · " : ""}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
