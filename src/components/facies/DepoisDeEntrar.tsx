import Image from "next/image";

/**
 * A degustação do PRODUTO, depois da degustação da leitura.
 *
 * A página mostrava a fácies da prova — grátis, completa, honesta — e **zero do
 * produto pago**. Quem clicava em "Fazer o diagnóstico" decidia gastar R$ 590
 * sem nunca ter visto uma tela. É o pedido mais caro que uma landing pode fazer
 * e o que menos combina com um produto cuja tese é "mostre a medida".
 *
 * Os três passos descrevem o que o sistema faz de fato, e cada um é verificável
 * no código — nenhum deles promete formato de item, que é o recurso que a página
 * anunciava e o motor não tem:
 *
 *   1. `diagnostic_blueprint.py` — baterias estratificadas por área. ⚠️ A
 *      PRIMEIRA passou a ser de 50 (o piso que ainda mede as 5 áreas) e as
 *      outras duas seguem em 100 — e o conjunto continua atrás de
 *      `ENABLE_ADAPTIVE_STUDY_PLAN_V1`, que é `false` em produção. Nenhum
 *      desses números pode ser anunciado nesta página enquanto for assim;
 *      os três passos abaixo foram escolhidos por rodarem SEM flag.
 *   2. `mastery_estimate.py` — Beta-Binomial por nó, com `is_confident`.
 *   3. `navigation_service._predicted_capacity` + `_interruption_risk` — os
 *      minutos saem do calendário e o plantão é inferido, nunca perguntado.
 *
 * A captura vem de `scripts/gerar-captura-produto.mjs`, com dados de exemplo e
 * regerável. Um PNG colado à mão envelheceria em silêncio, e a landing passaria
 * a mostrar uma tela que não existe mais — o defeito que este produto menos
 * pode ter.
 */
const PASSOS = [
  {
    n: "01",
    titulo: "Ela diz o tipo do seu erro, não só que você errou",
    texto:
      "Leitura que fechou cedo, confiança acima da evidência, alternativa vizinha, critério de desempate que faltou. O tempo de leitura é medido contra o tamanho do enunciado, não contra um cronômetro fixo — e a conta fica visível.",
  },
  {
    n: "02",
    titulo: "Toda questão sabe dizer por que apareceu",
    texto:
      "“Erro recente para corrigir”, “revisão vencida”, “cobrada pela sua prova-alvo”. Nenhuma questão chega sem motivo, e o motivo é uma frase em português.",
  },
  {
    n: "03",
    titulo: "A prova inteira, e um relatório que nenhum banco entrega",
    texto:
      "Monte a prova de uma instituição e um ano. Depois veja ritmo por terço, aceleração final, fadiga e calibração da sua confiança — sobre tempo medido de verdade, não sobre relógio de aba aberta.",
  },
];

export function DepoisDeEntrar() {
  return (
    <section aria-labelledby="depois-de-entrar">
      <span className="paper-eyebrow">Depois de entrar</span>
      <h2
        id="depois-de-entrar"
        className="mt-3 max-w-[26ch] font-serif text-2xl/snug font-semibold text-ink sm:text-3xl/snug"
      >
        A leitura da prova vira a sua rotina.
      </h2>

      <ol className="mt-8 grid max-w-[62ch] gap-6 sm:max-w-none sm:grid-cols-3">
        {PASSOS.map((passo) => (
          <li key={passo.n}>
            <span className="font-mono text-xs text-muted">{passo.n}</span>
            <h3 className="mt-2 font-serif text-lg font-semibold leading-snug text-ink">
              {passo.titulo}
            </h3>
            <p className="mt-2 text-sm leading-6 text-muted">{passo.texto}</p>
          </li>
        ))}
      </ol>

      {/* A figura ocupa a MEDIDA INTEIRA, e a prosa acima não.
          O contraste de largura é o que faz a captura ler como objeto e não como
          mais um parágrafo — e é sinal premium a custo zero de tom: nenhuma cor
          nova, nenhuma curva nova, nenhuma promessa nova. Esta é a única imagem
          da página e a prova mais persuasiva que ela tem. */}
      {/* `shadow-soft` e não `.paper-overlay`: a penumbra de overlay
          (`0 4px 16px`, 12%) é a de coisa que FLUTUA — menu, popover, diálogo.
          Uma figura no fluxo da página não flutua, e a sombra mais pesada a
          descolava do papel em vez de assentá-la nele. `--soft-shadow` são duas
          camadas de 6% e 4%, que é o peso de um objeto pousado.

          Nos dois casos a penumbra some no tema escuro (`none` para ambos os
          tokens, `globals.css:198-199`) — sombra escura sobre fundo escuro não
          separa nada, e a separação lá vem de `surface > paper` mais a borda. */}
      <figure className="mt-10">
        <div className="overflow-hidden rounded-surface border border-edge shadow-soft">
          {/* `unoptimized`: a imagem já sai do gerador no tamanho e na densidade
              certos, e o pipeline de otimização do Next só acrescentaria uma
              recodificação com perda sobre um PNG de texto — onde ela mais
              aparece. */}
          <Image
            src="/produto-hoje.png"
            alt="A tela Hoje da Fácies: a próxima ação já dimensionada — um bloco clínico de Ginecologia e Obstetrícia de 35 minutos — com o motivo logo abaixo do título (“nas duas últimas questões de pré-eclâmpsia a resposta saiu antes de a leitura fechar, e o tema é cobrado pela sua prova-alvo”) e a linha “≈ 60 min disponíveis · plantão detectado · 12h bloqueadas”."
            width={2128}
            height={1376}
            unoptimized
            className="block h-auto w-full"
            sizes="(min-width: 1024px) 64rem, 100vw"
          />
        </div>
        <figcaption className="mt-3 max-w-[62ch] text-sm text-muted">
          Ilustração com dados de exemplo. Os minutos saem do calendário e o plantão é
          detectado — a Fácies não pergunta quanto tempo você tem.
        </figcaption>
      </figure>
    </section>
  );
}
