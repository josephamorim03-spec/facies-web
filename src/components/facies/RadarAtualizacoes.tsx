import {
  ATUALIZACOES,
  COBERTURA_FONTES,
  FONTES_NUNCA_VARRIDAS,
  METODO_ATUALIZACOES,
  ROTULO_NIVEL,
  fontePrimaria,
  type Atualizacao,
} from "@/lib/atualizacoes";
import { PainelLaudo, RotuloLaudo } from "./PainelLaudo";

/**
 * O que mudou na medicina, com data e fonte — e por que isto NÃO é a previsão.
 *
 * ## A tentação que esta tela recusa
 *
 * O caminho fácil seria chamar isto de "o que vai cair". Foi medido e não se
 * sustenta: o termo de pressão rendeu 0,2–0,4% de ganho onde o critério, escrito
 * antes de medir, exigia 5%, e melhorou 5–8 de 14 aplicações onde exigia 10. A
 * causa é estrutural — os assuntos tocados caem entre a 39ª e a 281ª posição do
 * ranking, e um empurrão limitado não fecha esse vão.
 *
 * Então a seção afirma só o que é verificável: a mudança existe, tem data, tem
 * portaria e tem link. O aluno decide o que fazer com isso. É a mesma regra do
 * painel de validação da prova — publicar o piso ao lado do número.
 *
 * ## A distância até a prova é fato, não causa
 *
 * `dias_antes_da_prova` é subtração de datas. A tela mostra o número e para aí.
 * Dizer "entrou tarde demais para influenciar" seria afirmar causalidade que o
 * backtest não sustenta: a janela de elaboração foi varrida e nenhum valor dela
 * passou nos critérios.
 *
 * ## A cobertura parcial aparece
 *
 * `FONTES_NUNCA_VARRIDAS` vira aviso na tela. Uma fonte esquecida tem de virar
 * buraco visível — do contrário a página diria, por omissão, que o levantamento
 * está completo.
 */

function dataCurta(iso: string): string {
  const [ano, mes, dia] = iso.split("-");
  return `${dia}/${mes}/${ano}`;
}

function Linha({ a }: { a: Atualizacao }) {
  const fonte = fontePrimaria(a);
  const nivel = ROTULO_NIVEL[a.nivel] ?? a.nivel;
  return (
    <li className="border-t border-rule py-4 first:border-t-0">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <RotuloLaudo>{nivel}</RotuloLaudo>
        <span className="font-mono text-micro text-muted">
          {dataCurta(a.vigencia)}
        </span>
        {a.dias_antes_da_prova >= 0 ? (
          <span className="font-mono text-micro text-muted">
            {a.dias_antes_da_prova} dias antes da prova
          </span>
        ) : (
          <span className="font-mono text-micro text-muted">
            posterior à prova
          </span>
        )}
      </div>

      <p className="mt-1 text-sm font-semibold text-ink">{a.titulo}</p>

      {a.subtemas.length > 0 ? (
        <p className="mt-1 text-sm text-muted">
          Assunto{a.subtemas.length > 1 ? "s" : ""}: {a.subtemas.join(" · ")}
        </p>
      ) : null}

      {fonte ? (
        <a
          className="mt-2 inline-block font-mono text-micro text-primary underline underline-offset-2"
          href={fonte.url}
          target="_blank"
          rel="noreferrer noopener"
        >
          fonte oficial
        </a>
      ) : null}
    </li>
  );
}

export function RadarAtualizacoes({
  numero,
  limite = 12,
}: {
  numero: string;
  limite?: number;
}) {
  if (ATUALIZACOES.length === 0) return null;

  const mostradas = ATUALIZACOES.slice(0, limite);
  const restantes = ATUALIZACOES.length - mostradas.length;

  return (
    <PainelLaudo
      numero={numero}
      titulo="O que mudou na medicina"
      nota="com data e fonte oficial"
    >
      {/* O aviso vem ANTES da lista, não depois. Uma ressalva no rodapé é uma
          ressalva que ninguém lê — e esta é a que separa informar de prometer. */}
      {!METODO_ATUALIZACOES.entra_no_score ? (
        <p className="paper-reading mb-4 border-l-2 border-accent pl-4 text-sm leading-relaxed text-ink">
          <b>Isto não é a nossa previsão.</b> Testamos se atualizações recentes
          ajudavam a acertar o que cai, medindo contra 14 provas já aplicadas — e
          não ajudaram o bastante para entrar na conta. Deixamos a lista aqui
          porque saber que o protocolo mudou vale por si, com a portaria ao lado
          para você conferir.
        </p>
      ) : null}

      <ul>
        {mostradas.map((a) => (
          <Linha key={a.slug} a={a} />
        ))}
      </ul>

      <p className="mt-4 font-mono text-micro text-muted">
        {restantes > 0 ? `mais ${restantes} não exibidas · ` : ""}
        {FONTES_NUNCA_VARRIDAS.length > 0
          ? `levantamento parcial: ${FONTES_NUNCA_VARRIDAS.length} de ${COBERTURA_FONTES.length} fontes ainda não varridas`
          : "todas as fontes varridas"}
      </p>
    </PainelLaudo>
  );
}
