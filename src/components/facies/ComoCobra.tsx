import type { AfirmacaoForma, Banca } from "@/lib/facies";
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
 * ## Dois motores, e eles não competem
 *
 * O motor **bruto** compara a proporção desta banca com a média nacional
 * (Wilson + tamanho de efeito). O motor **padronizado** (migration 129) compara
 * com o esperado pelos ASSUNTOS que ela cobra, e exige que o efeito supere o
 * ruído entre as edições dela.
 *
 * A pergunta do aluno precisa dos dois. Urgências Abdominais tem 35,2% de
 * enunciado longo no acervo nacional contra 11,8% de Epidemiologia: uma banca
 * que cobra muito Trauma parece vinheta-pesada sem ter escolhido nada, e quem
 * treinar leitura de caso em vez de Trauma treinou a coisa errada.
 *
 * ⚠️ MEDIDO antes de confiar: nos 81 pares em que os dois falam do mesmo fato,
 * **nenhum discorda em sinal**, e a mediana da diferença entre as duas escalas
 * de tamanho é 0,3 pp. Eles não precisavam de arbitragem — precisavam de
 * composição, que é o que `assinatura` faz no gerador.
 *
 * O que isso muda na tela: saem **33** afirmações que a composição explicava;
 * entram **60** sobre enunciado longo, com magnitude mediana de 18 pontos — os
 * maiores efeitos do acervo, e a página nunca os mostrou.
 *
 * ## E um terceiro gate, que não é sobre os motores: o TEMPO
 *
 * Os dois agregam todos os anos. A DF-SES fez 100% certo/errado de 2016 a 2023 e
 * **zero** em 2024, 2025 e 2026 — três edições, 960 questões — e esta seção
 * dizia "certo/errado em 79% das questões" a quem vai prestar a próxima. Eram
 * **15 das 135** afirmações descrevendo uma prova que não existe mais, e o
 * defeito atravessa os três níveis de confiança, inclusive o `consenso`.
 *
 * O gate vive em `facies_assinatura.py::regime_ainda_vale` e apenas SUPRIME.
 * Anunciar "esta banca mudou de formato" é afirmação sobre prova alheia, e a
 * casa já decidiu que isso exige edital, não estatística nossa.
 *
 * ## A frase muda com o que foi possível provar
 *
 * Quando a composição foi descontada, a frase ATRIBUI a escolha à banca. Quando
 * não foi — hoje só nas bancas pequenas demais para o painel padronizado — a
 * frase DESCREVE a prova e não diz de quem é a escolha. Essa diferença é o
 * produto inteiro desta seção, e é por isso que ela vive na estrutura da frase e
 * não num selo.
 *
 * A camada descritiva encolhe de 16 para 3 afirmações quando a migration 134
 * chegar: ela estende a padronização aos quatro formatos que faltavam, e o que
 * era peso extrapolado vira veredito.
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
 *
 * ⚠️ Vale só para o CAMINHO ANTIGO. O caminho novo aplica o mesmo 3 sobre a
 * diferença em si (`tamanho_pp`), que é a pergunta que este piso sempre quis
 * fazer — "quantas questões em 100 mudam" — e que a proporção crua só
 * aproximava.
 */
const PISO_RELEVANCIA = 3;

/** Quantas vezes, quando os dois lados têm corpo.
 *
 * ⚠️ A RAZÃO INVERTE conforme a direção. `a / b` vale para "cobra mais"; para
 * "cobra menos" o mesmo cálculo dá 0,1 e a frase sairia "cobra 0,1 vezes
 * menos", que não quer dizer nada. Quem cobra menos é descrito pelo inverso.
 *
 * Com um dos lados minúsculo a razão explode ("18 vezes") e informa menos que a
 * diferença crua, então ela só entra quando ambos passam de 2.
 */
function multiplo(observado: number, referencia: number): number | null {
  if (referencia < 2 || observado < 2) return null;
  return observado > referencia ? observado / referencia : referencia / observado;
}

function vezes(valor: number): string {
  return `${dec(valor)} vez${valor >= 2 ? "es" : ""}`;
}

/**
 * A afirmação cuja composição FOI descontada — ela atribui a escolha à banca.
 *
 * ⚠️ Os dois números da frase têm o MESMO denominador (a base com tema), de
 * propósito. Misturar a proporção sobre a prova inteira com o esperado sobre a
 * base classificada produziria uma comparação que não fecha, e o leitor não tem
 * como perceber.
 */
function Atribuida({ linha }: { linha: AfirmacaoForma }) {
  const observadas = linha.observado ?? 0;
  const esperadas = linha.esperado ?? 0;
  const pct = linha.pct_estrato ?? 0;
  const pctEsperado = linha.pct_esperado ?? 0;

  // O zero é o achado mais forte do acervo e precisa da própria frase: "0% e o
  // esperado é 0,4%" some na página, enquanto "nenhuma das 73 previstas" é a
  // coisa mais característica que se pode dizer de uma prova.
  if (observadas === 0) {
    // ⚠️ MESMO frame das outras frases ("{rótulo} em ..."), e não um frame
    // próprio. Os rótulos são heterogêneos — "pede a incorreta" é verbal,
    // "enunciado longo" é nominal — e qualquer moldura que precise de um
    // substantivo ("esta prova nunca traz pede a incorreta") sai quebrada em
    // metade das medidas. O frame com "em" aceita as duas.
    return (
      <>
        <p className="max-w-[62ch] text-base text-ink lg:text-lg">
          <b className="font-semibold">{linha.rotulo}</b> em{" "}
          <b className="font-semibold">nenhuma</b> das{" "}
          <span className="tabular-nums">
            {(linha.base_estrato ?? 0).toLocaleString("pt-BR")}
          </span>{" "}
          questões classificadas.
        </p>
        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          Pelos assuntos que esta prova cobra, o esperado seriam{" "}
          <span className="tabular-nums">{Math.round(esperadas)}</span> questões.
        </p>
      </>
    );
  }

  const mult = multiplo(pct, pctEsperado);
  return (
    <>
      <p className="max-w-[62ch] text-base text-ink lg:text-lg">
        <b className="font-semibold">{linha.rotulo}</b> em{" "}
        <span className="tabular-nums">{pct.toFixed(0)}%</span> das questões
        {linha.direcao === "mais" ? "" : " — bem menos do que se esperaria"}.
      </p>
      <p className="mt-1 max-w-[62ch] text-sm text-muted">
        Pelos assuntos que esta prova cobra, o esperado seriam{" "}
        <span className="tabular-nums">{dec(pctEsperado)}%</span>
        {mult ? `, ou seja, ela usa ${vezes(mult)} ${linha.direcao}` : ""}.
      </p>
    </>
  );
}

/**
 * A afirmação cuja composição NÃO foi descontada — ela descreve a prova.
 *
 * Mesma frase de sempre, e isso é intencional: são os quatro formatos que o
 * motor padronizado não mede, e nada mudou sobre eles. O que muda é a frase não
 * dizer que a banca *escolheu* — porque disso não há prova.
 */
function Descritiva({
  rotulo,
  pct,
  media,
}: {
  rotulo: string;
  pct: number;
  media: number;
}) {
  const acima = pct > media;
  const mult = multiplo(pct, media);
  return (
    <>
      <p className="max-w-[62ch] text-base text-ink lg:text-lg">
        <b className="font-semibold">{rotulo}</b> em{" "}
        <span className="tabular-nums">{pct.toFixed(0)}%</span> das questões
        {acima ? "" : " — bem menos que as outras"}.
      </p>
      <p className="mt-1 max-w-[62ch] text-sm text-muted">
        A média das {TOTAL_BANCAS} bancas é{" "}
        <span className="tabular-nums">{dec(media)}%</span>
        {mult ? `, ou seja, esta prova cobra ${vezes(mult)} ${acima ? "mais" : "menos"}` : ""}
        .
      </p>
    </>
  );
}

/**
 * A nota do painel 03 — e ela precisou mudar, não é enfeite.
 *
 * ⚠️ A nota era `"exato · sem estimativa"`, e isso PASSOU A SER FALSO. O
 * esperado de uma linha atribuída é um modelo: a composição da banca vezes as
 * taxas nacionais por tema. É a melhor conta disponível e continua não sendo
 * medição direta, e afirmação falsa em painel público é o defeito mais caro
 * desta base porque ninguém volta a conferir.
 *
 * ⚠️ E ela é METODOLÓGICA, não um denominador — de propósito. A seção é MISTA:
 * a linha atribuída é proporção sobre a base com tema, a descritiva é sobre a
 * prova inteira (que é o denominador da média nacional ao lado dela). Uma nota
 * dizendo "909 questões classificadas" seria lida como valendo para as duas, e
 * estaria errada para uma. Onde a base importa de verdade — a frase do zero —
 * ela aparece dentro da própria frase.
 */
export function notaComoCobra(banca: Banca): string {
  const atribuida = banca.assinatura?.some((l) => l.confianca !== "bruta");
  return atribuida
    ? "comparado ao esperado pelos assuntos desta prova"
    : "exato · sem estimativa";
}

const VAZIO = (
  <p className="max-w-[62ch] text-base text-muted lg:text-lg">
    No formato das questões esta banca segue o padrão das demais — e isso é
    informação: não há pegadinha de enunciado para treinar aqui, e o preparo se
    decide pelo conteúdo.
  </p>
);

export function ComoCobra({ banca }: { banca: Banca }) {
  // ⚠️ Precedência, não fallback preguiçoso: o gerador é a autoridade quando se
  // pronunciou, mesmo contrato que `decidirExibicao`. `undefined` é dataset
  // anterior à mudança; `[]` é o gerador dizendo "nada a afirmar", e as duas
  // coisas levam a telas diferentes.
  if (banca.assinatura) {
    if (banca.assinatura.length === 0) return VAZIO;
    const atribuiveis = banca.assinatura.some((l) => l.confianca !== "bruta");
    return (
      <div className="grid gap-4">
        {banca.assinatura.map((linha) => (
          <div
            key={linha.medida}
            className="border-t border-rule pt-4 first:border-t-0 first:pt-0"
          >
            {linha.confianca === "bruta" ? (
              <Descritiva
                rotulo={linha.rotulo}
                pct={linha.pct ?? 0}
                media={linha.media_nacional ?? 0}
              />
            ) : (
              <Atribuida linha={linha} />
            )}
          </div>
        ))}

        <p className="mt-1 max-w-[62ch] text-sm text-muted">
          {atribuiveis
            ? "O “esperado” já desconta os assuntos que esta prova cobra — assunto prevê formato, e sem esse desconto uma banca de muito Trauma pareceria escolher enunciado longo sem ter escolhido nada. O resto ela faz como todo mundo."
            : "Só aparecem os formatos em que esta banca se afasta das demais com margem que a base dela sustenta. O resto ela faz como todo mundo."}
        </p>
      </div>
    );
  }

  const distintivos = formatosDistintivos(banca).filter(
    (linha) =>
      Math.max(linha.pct, NACIONAL.formato_pct[linha.codigo] ?? 0) >=
      PISO_RELEVANCIA,
  );

  if (distintivos.length === 0) return VAZIO;

  return (
    <div className="grid gap-4">
      {distintivos.map((linha) => (
        <div
          key={linha.codigo}
          className="border-t border-rule pt-4 first:border-t-0 first:pt-0"
        >
          <Descritiva
            rotulo={linha.rotulo}
            pct={linha.pct}
            media={NACIONAL.formato_pct[linha.codigo] ?? 0}
          />
        </div>
      ))}

      <p className="mt-1 max-w-[62ch] text-sm text-muted">
        Só aparecem os formatos em que esta banca se afasta das demais com margem
        que a base dela sustenta. O resto ela faz como todo mundo.
      </p>
    </div>
  );
}
