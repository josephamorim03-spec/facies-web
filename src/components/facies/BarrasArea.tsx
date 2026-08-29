import { mediaNacionalDaArea, TOTAL_BANCAS } from "@/lib/facies";
import { resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_LANDING_LABELS, AREA_VAR, fundirObstetriciaEmGo } from "@/lib/areaIdentity";
import { dec } from "@/lib/decimal";

/**
 * Distribuição por área, com a MÉDIA NACIONAL marcada dentro da barra.
 *
 * ## Por que a marca é o painel inteiro
 *
 * "Cirurgia 24%" não informa: o aluno não tem como saber se 24% é muito. O que
 * responde a pergunta é o denominador — a média das bancas do acervo. Antes
 * disso, este painel era decorativo por mais bonito que ficasse.
 *
 * Duas formas anteriores erraram o alvo por razões opostas:
 *
 *   1. **Sete barras em petróleo.** Mostravam a proporção e nada mais: sem
 *      comparação, sem cor de área, sem hierarquia entre a maior e a menor.
 *   2. **Treemap colorido.** Ganhou cor e virou peça de print, mas a comparação
 *      com a média ficou atrás de um CLIQUE — e o que vende é justamente ela.
 *      Informação que exige interação para aparecer não aparece.
 *
 * A barra com marca resolve os dois: a largura é a incidência desta prova, o
 * risco vertical é a média do acervo, e a distância entre os dois é a fácies.
 * Tudo de relance, sem clique.
 *
 * ## O âmbar tem limiar, e ele não é estético
 *
 * O delta só muda de cor a partir de 3 pontos percentuais. Abaixo disso a
 * diferença é ruído de amostragem entre bancas e destacá-la treinaria o leitor
 * a ver padrão onde não há. É a mesma disciplina do `formatoDistintivo`, que só
 * exibe formato quando a margem se sustenta na base.
 */

/** A partir de quantos pontos percentuais a diferença merece cor. */
const LIMIAR_DESTAQUE = 3;

/**
 * "Outros" NÃO recebe delta, e isso corrigiu um erro que a primeira renderização
 * mostrou de cara.
 *
 * No ENAMED ele aparecia com **+8,1 em âmbar** — o segundo maior destaque do
 * painel. Mas "Outros" é o resto: o que a rotulagem ainda não encaixou em
 * nenhuma das seis áreas. Um desvio grande ali diz que ESTA leitura tem mais
 * questões sem classificar, e não que a prova cobra mais de alguma coisa.
 * Tratá-lo como achado é fabricar um padrão a partir de uma lacuna — o oposto
 * do que o limiar de 3 pontos existe para evitar.
 *
 * Ele continua VISÍVEL, porque escondê-lo faria os percentuais não fecharem em
 * 100 e a barra passaria a mentir sobre a própria base. O que sai é a
 * comparação, substituída por uma palavra que diz o que ele é.
 */
const RESIDUAL = "OU";

type Linha = { rotulo: string; n: number; pct: number };

export function BarrasArea({ linhas }: { linhas: Linha[] }) {
  // OB entra em GO antes da media: `mediaNacionalDaArea` e por ROTULO, e
  // pedi-la para as duas separadas devolveria duas medias que nao somam a do
  // par. A fusao vem primeiro para que a media seja pedida uma vez, ja com o
  // rotulo unificado.
  const unidas = fundirObstetriciaEmGo(
    linhas,
    (rotulo) => resolveDisplayArea(null, rotulo),
    (a, b) => ({ ...a, n: a.n + b.n, pct: a.pct + b.pct }),
  );

  const comMedia = unidas
    .filter((linha) => linha.pct > 0)
    .map((linha) => ({ ...linha, media: mediaNacionalDaArea(linha.rotulo) }))
    .sort((a, b) => b.pct - a.pct);

  if (comMedia.length === 0) return null;

  // A escala acomoda a maior das DUAS grandezas, senão uma marca de média acima
  // do pico da prova cairia fora da barra — que é justamente o caso mais
  // interessante ("esta prova cobra muito menos que as outras").
  const teto =
    Math.max(...comMedia.map((l) => Math.max(l.pct, l.media ?? 0))) + 4;

  return (
    <div className="grid gap-3">
      {comMedia.map((linha) => {
        const area = resolveDisplayArea(null, linha.rotulo);
        const cor = AREA_VAR[area] ?? AREA_VAR.OU;
        const ehResidual = area === RESIDUAL;
        const diferenca =
          ehResidual || linha.media == null ? null : linha.pct - linha.media;
        const destaca =
          diferenca != null && Math.abs(diferenca) >= LIMIAR_DESTAQUE;

        return (
          <div
            key={linha.rotulo}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 text-sm sm:grid-cols-[minmax(7rem,11rem)_minmax(0,1fr)_auto]"
          >
            <span className="flex min-w-0 items-center gap-2">
              {/* Quadrado da cor da área: marca gráfica, piso 3:1, que a paleta
                  recalibrada entrega com folga. A cor NUNCA vai no texto. */}
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 shrink-0 rounded-control"
                style={{ background: cor }}
              />
              {/* Sem `truncate` e sem `title`: o par dos dois esconde texto e
                  devolve a leitura so ao PONTEIRO — no toque nao ha o que
                  passar por cima. Nome de area e curto; se faltar largura, a
                  quebra e melhor que o corte com dica escondida. */}
              {/* O nome CURTO do design, e não `linha.rotulo` cru do dataset.
                  O dataset traz "Clínica Médica", "Ginecologia"; o pacote de
                  design escreve "clínica", "GO". Passar pelo mapa também
                  normaliza as variações de grafia entre bancas — o rótulo cru
                  vinha direto do gerador. */}
              <span className="text-ink">
                {AREA_LANDING_LABELS[area]}
              </span>
            </span>

            {/* A barra ocupa a linha inteira no celular: espremida ao lado do
                nome numa tela de 390px ela fica com ~60px e deixa de comunicar
                proporção, que é a única coisa que ela faz. */}
            <span
              aria-hidden="true"
              className="relative order-last col-span-2 block h-3 rounded-control border border-rule bg-paper sm:order-none sm:col-span-1"
            >
              <span
                className="absolute inset-y-0 left-0 block"
                style={{
                  width: `${(linha.pct / teto) * 100}%`,
                  background: cor,
                  transition: "width var(--motion-slow) var(--ease-paper)",
                }}
              />
            </span>

            <span className="whitespace-nowrap text-right tabular-nums text-ink">
              {linha.pct.toFixed(0)}%
            </span>

            {/* O leitor de tela recebe a frase inteira, porque a barra e o
                risco não dizem nada para quem não os enxerga. */}
            <span className="sr-only">
              {linha.n.toLocaleString("pt-BR")} questões.
              {/* "Outras", e não "Resto". O rótulo visível dizia "resto" e saiu
                  a pedido; esta linha ficou para trás porque é invisível — e
                  quem ouve a página recebia duas palavras para a mesma coisa,
                  sem a barra ao lado para ligar uma à outra. */}
              {ehResidual
                ? " Outras: o que a rotulagem ainda não encaixou numa das áreas."
                : linha.media != null
                  ? ` A média das ${TOTAL_BANCAS} bancas do acervo é ${dec(
                      linha.media,
                    )}%.`
                  : ""}
            </span>
          </div>
        );
      })}

      {/* ⚠️ A COMPARAÇÃO COM A MÉDIA SAIU DAQUI, e a razão é que ela media a
          NOSSA classificação, não a prova.

          Prova de residência é montada com o mesmo número de questões por grande
          área. O acervo confirma onde a classificação é boa: Gineco mais
          Obstetrícia dá 19,9% no total das {TOTAL_BANCAS} bancas, e fica entre
          18,7% e 20,4% em todas elas — cravado nos 20% esperados.

          Onde o vocabulário é ambíguo, não. Medido no acervo de acesso direto:

              Clínica Médica  32,9%   esperado ~20   +12,9
              Cirurgia        14,3%                   −5,7
              Pediatria       13,3%                   −6,7
              Preventiva      14,5%                   −5,5
              Outros           5,2%   esperado   0    +5,2

          Os desvios somam zero: Clínica Médica e "Outros" absorvem o que falta
          nas outras três. A causa está à vista no grafo — 48% das questões têm
          grande área mas nenhum assunto, e Cirurgia sozinha tem 58% assim.

          Enquanto isso valer, dizer "esta prova cobra Cirurgia 9,9 pontos acima
          da média" é uma frase sobre o classificador com cara de frase sobre a
          prova. A barra fica, porque a forma é real e a leitura por assunto
          (painel 01) não depende deste eixo. O que sai é a alegação. */}
      {/* ⚠️ A NOTA PRECISA RESPONDER "POR QUE NÃO É 20% CADA?".
          A anterior dizia que toda prova distribui de forma parecida — e logo
          acima dela o leitor via 37,8% em Clínica Médica. Ela não explicava a
          diferença; ela a tornava mais estranha.

          A resposta é que são dois eixos. O edital divide a prova em BLOCOS; a
          barra mede o que cada questão COBRA. Quem lê "área" pensa no bloco do
          edital, então a nota precisa nomear a diferença em voz alta — e é
          barata: uma frase resolve uma suspeita que contamina os outros
          painéis.

          O eixo de bloco existe no dado (`blocos`, migration 119 do kbank) e
          está com 1,2% a 9% de cobertura, mediana 4,1 — nenhuma banca acima de
          50%. Publicar uma distribuição em cima disso seria inventar. Quando a
          cobertura subir, esta nota vira um segundo gráfico. */}
      <p className="mt-1 text-sm text-muted">
        O edital divide a prova em blocos de tamanho parecido. Esta barra mede
        outra coisa: o que cada questão <strong className="font-normal text-ink">cobra</strong>.
        Clínica Médica pesa mais porque é o guarda-chuva mais largo — e “Outros”
        só existe aqui, porque nem toda questão cabe numa das cinco. É a forma
        desta prova, não um diferencial dela.
      </p>
    </div>
  );
}
