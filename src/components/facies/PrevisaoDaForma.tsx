import {
  METODO_DA_FORMA,
  areasRelevantes,
  formaDaBanca,
  motivoDaAusencia,
} from "@/lib/forma";
import { PainelLaudo } from "./PainelLaudo";

/**
 * Quantas questões de cada área a próxima prova deve ter.
 *
 * ## Esta é a previsão. As outras quatro não sobreviveram
 *
 * Medimos cinco formas de prever, fora de amostra. Decaimento por recência,
 * atualizações clínicas, estratificação por área e probabilidade por assunto
 * reprovaram nos critérios escritos antes de medir. Esta passou, com **3,5 pp**
 * de erro médio — cerca de 3,5 questões numa prova de 100.
 *
 * ## A barra é a média; a faixa clara é o intervalo
 *
 * E o intervalo é **por área**, porque é aí que mora a informação: Ginecologia
 * varia meia questão entre edições e Clínica Médica varia cinco. Desenhar as
 * duas com a mesma barra diria que sabemos as duas igualmente bem, e não
 * sabemos.
 *
 * ## O que esta tela recusa
 *
 * Não diz *quais assuntos* virão em cada área — isso foi medido e o número não
 * se sustentou. E não inventa previsão para banca com menos de três edições:
 * ali ela mostra o motivo, porque "não temos histórico" é informação e o vazio
 * não é.
 */

function Barra({
  media,
  desvio,
  maximo,
}: {
  media: number;
  desvio: number;
  maximo: number;
}) {
  const pct = (v: number) => `${Math.max(0, Math.min(100, (v / maximo) * 100))}%`;
  return (
    <span
      className="relative block h-2 w-full rounded-control bg-surfaceMuted"
      aria-hidden="true"
    >
      {/* O intervalo primeiro, por baixo: ele é o contexto da média, não um
          enfeite ao redor dela. */}
      <span
        className="absolute inset-y-0 rounded-control bg-primary/25"
        style={{
          left: pct(Math.max(0, media - desvio)),
          right: `calc(100% - ${pct(media + desvio)})`,
        }}
      />
      <span
        className="absolute inset-y-0 w-[2px] bg-primary"
        style={{ left: pct(media) }}
      />
    </span>
  );
}

export function PrevisaoDaForma({
  numero,
  institutionKey,
}: {
  numero: string;
  institutionKey: string;
}) {
  const forma = formaDaBanca(institutionKey);

  if (!forma) {
    const motivo = motivoDaAusencia(institutionKey);
    if (!motivo) return null;
    return (
      <PainelLaudo numero={numero} titulo="Como a prova deve vir">
        <p className="paper-reading text-sm leading-relaxed text-ink">
          Ainda não dá para prever a composição desta prova: <b>{motivo}</b>.
          Precisamos de pelo menos três edições para dizer quanto cada área varia
          — com duas, o intervalo seria invenção nossa, não medida.
        </p>
      </PainelLaudo>
    );
  }

  const areas = areasRelevantes(forma);
  const maximo = Math.max(...areas.map((a) => a.media_questoes + a.desvio_questoes));

  return (
    <PainelLaudo
      numero={numero}
      titulo="Como a prova deve vir"
      nota={`sobre ${forma.edicoes} edições · a última teve ${forma.prova_tipica} questões`}
    >
      <ul className="grid gap-3">
        {areas.map((a) => (
          <li key={a.area} className="grid gap-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="text-sm text-ink">{a.area}</span>
              <span className="font-mono text-sm text-ink">
                {a.media_questoes.toLocaleString("pt-BR", {
                  maximumFractionDigits: 0,
                })}
                <span className="text-muted">
                  {" ± "}
                  {a.desvio_questoes.toLocaleString("pt-BR", {
                    maximumFractionDigits: 1,
                  })}
                </span>
              </span>
            </div>
            <Barra
              media={a.media_questoes}
              desvio={a.desvio_questoes}
              maximo={maximo}
            />
          </li>
        ))}
      </ul>

      {/* A margem de erro vem junto do número, não numa nota de rodapé. Publicar
          a previsão sem o erro medido ao lado é o que esta página inteira se
          recusa a fazer. */}
      <p className="paper-reading mt-4 border-l-2 border-accent pl-4 text-sm leading-relaxed text-ink">
        <b>
          Testamos esta previsão em provas já aplicadas: ela erra cerca de{" "}
          {METODO_DA_FORMA.erro_medido_pp.toLocaleString("pt-BR")} questões por
          área.
        </b>{" "}
        Cada previsão foi feita usando só as edições anteriores àquela prova. A
        faixa clara é o quanto aquela área costuma variar de um ano para o outro —
        onde ela é estreita, a banca é regular; onde é larga, é aposta.
      </p>
    </PainelLaudo>
  );
}
