import { resolveDisplayArea } from "@/lib/areaDisplay";
import { AREA_FULL_LABELS, AREA_VAR } from "@/lib/areaIdentity";

/**
 * A assinatura da prova numa faixa só — a `.strip` do protótipo.
 *
 * Uma barra dividida em segmentos cuja largura é o peso de cada grande área.
 * Ela não substitui o painel de distribuição: não traz número, não traz a média
 * nacional, e é pequena demais para rótulo. O que ela faz, e nenhum outro
 * elemento da página faz, é permitir COMPARAR provas antes de abrir qualquer
 * uma — o chip deixa de ser um nome e passa a ter forma própria.
 *
 * Duas provas com fácies diferentes ficam visivelmente diferentes aqui, e é
 * essa diferença que a página inteira afirma existir. Antes ela só aparecia
 * depois de dois cliques.
 *
 * Puramente decorativa para o leitor de tela (`aria-hidden`): o nome da banca
 * já está no botão que a contém, e ler sete percentuais em sequência antes de
 * cada chip tornaria a lista impraticável. Quem quiser o número abre a prova.
 */
/**
 * ORDEM FIXA, e ela é o que faz a faixa servir para alguma coisa.
 *
 * `areas.linhas` chega ordenada por incidência, que muda de banca para banca. A
 * primeira renderização mostrou o efeito: o ENAMED abria em azul-cinza-rosa e a
 * USP em azul-laranja-rosa, então comparar duas faixas exigia LER a legenda de
 * cada uma — e a faixa existe justamente para dispensar leitura.
 *
 * Com a sequência fixa, a mesma posição é sempre a mesma área e a diferença
 * entre duas provas salta: a USP tem o bloco de Cirurgia visivelmente maior que
 * o de qualquer outra, e isso se vê sem nome nenhum na tela.
 *
 * O resto ("Outras") vai para o fim de propósito: ele não é uma área, e no meio
 * da sequência quebraria a leitura de vizinhança entre as áreas de verdade.
 */
const ORDEM: string[] = ["CM", "CG", "PD", "GO", "OB", "MP", "OU"];

/**
 * As três alturas do handoff de design (§3), e elas não são decoração.
 *
 * A faixa muda de função com o tamanho: dentro do chip ela é uma miniatura que
 * serve para COMPARAR provas de relance, e ali rótulo não cabe; na abertura da
 * página ela é a assinatura, e no bloco de leitura ela é o objeto da frase.
 *
 * O `gap` acompanha: 1px na miniatura, porque a 24px de altura dois pixels de
 * vão comem um segmento estreito inteiro; 2px nas grandes, que é o valor que o
 * handoff pede e onde ele efetivamente separa matizes vizinhas.
 */
const ALTURAS = {
  /** miniatura do chip — a que já existia */
  chip: "h-6 gap-px",
  /** A ABERTURA da direção `1b`: 64px no celular, 150px a partir de 1040.
   *
   * ⚠️ Estes números NÃO são os da `.strip--previa` da v7 (56/76), e a
   * diferença é de função. Na v7 a faixa é PRÉVIA: ela vem depois do `h1` e
   * anuncia o que há abaixo. Na `1b` ela é a ABERTURA — a primeira coisa da
   * página, e o argumento inteiro em uma imagem.
   *
   * Medido no artboard `1b` (390px): faixa 64px, `h1` 38px. A faixa é **1,68×**
   * o corpo do título. Eu tinha 76px de faixa com `h1` de 96px — razão 0,79, o
   * inverso — porque misturei a composição da `1b` com a escala de desktop da
   * v7. Essa combinação não existe em desenho nenhum, e era a desproporção que
   * se via na tela.
   *
   * O `1b` só existe em 390px, então o desktop segue a PROPORÇÃO e não o
   * número.
   *
   * ⚠️ E A PROPORÇÃO SE MEDE CONTRA O `h1` ATUAL, não contra o que ele era.
   * Eu tinha posto 150px derivando 1,56 de um `h1` de 96px. O `h1` foi reduzido
   * depois para 34/54/64 (desvio aprovado, registrado em
   * `scripts/spec-do-design.mjs`), e com 64px a mesma faixa de 150 dá **2,34** —
   * a faixa passando a dominar muito mais do que no desenho.
   *
   * 108px é 1,68 × 64: a razão exata do artboard contra o `h1` que a página tem
   * hoje. No celular ficam os 64px literais do `1b`.
   *
   * A lição: número derivado de outro número não sobrevive à mudança do
   * primeiro. Se o `h1` mudar de novo, esta altura muda junto — e é por isso
   * que a conta está escrita aqui em vez de só o resultado. */
  previa: "h-16 gap-0.5 lg:h-[108px]",
  /** bloco de leitura: 84px no celular, 150px no desktop.
   *
   * O salto é grande de propósito. Na prévia a faixa é uma miniatura que
   * convida; no bloco de leitura ela É o objeto da frase, e a 84px num monitor
   * ela volta a parecer miniatura — o leitor procura o gráfico "de verdade"
   * abaixo dela e não encontra nada. */
  leitura: "h-[84px] gap-0.5 sm:h-[150px]",
} as const;

export function FaixaAreas({
  linhas,
  className = "",
  altura = "chip",
  rotulo,
  legenda = false,
}: {
  linhas: { rotulo: string; pct: number }[];
  className?: string;
  altura?: keyof typeof ALTURAS;
  /**
   * Rótulo acessível. Quando presente, a faixa deixa de ser decorativa e passa
   * a `role="img"` — é o que o handoff §5 exige de "cor nunca é o único
   * portador de significado".
   *
   * Continua OPCIONAL, e o padrão continua sendo `aria-hidden`, porque dentro
   * do chip o nome da banca já está no botão que a contém: ler sete percentuais
   * antes de cada chip tornaria a lista impraticável.
   */
  rotulo?: string;
  /**
   * A legenda com nome e percentual sob a faixa. Vive AQUI, e não em quem
   * chama, porque depende da mesma `ORDEM` e do mesmo recorte de segmentos —
   * duas listas ordenadas por regras que só por convenção coincidem acabam
   * divergindo, e a legenda passaria a nomear a cor errada.
   */
  legenda?: boolean;
}) {
  const segmentos = linhas
    .filter((linha) => linha.pct > 0)
    .map((linha) => ({ ...linha, area: resolveDisplayArea(null, linha.rotulo) }))
    .sort((a, b) => ORDEM.indexOf(a.area) - ORDEM.indexOf(b.area));
  if (segmentos.length === 0) return null;

  const total = segmentos.reduce((soma, linha) => soma + linha.pct, 0);
  if (total <= 0) return null;

  // O rótulo acessível é a própria leitura da faixa, em palavras: quem não vê a
  // cor recebe a mesma informação na mesma ordem.
  const descricao = rotulo
    ? `${rotulo}: ${segmentos
        .map(({ area, ...linha }) => `${AREA_FULL_LABELS[area]} ${linha.pct.toFixed(0)}%`)
        .join(", ")}`
    : undefined;

  const barra = (
    <span
      role={descricao ? "img" : undefined}
      aria-label={descricao}
      aria-hidden={descricao ? undefined : true}
      // `gap` sobre o fundo da régua: separa segmentos de matiz vizinha sem
      // introduzir borda nem cor nova.
      className={`flex w-full overflow-hidden rounded-control bg-rule ${ALTURAS[altura]} ${
        legenda ? "" : className
      }`.trim()}
    >
      {segmentos.map(({ area, ...linha }) => {
        return (
          <span
            key={linha.rotulo}
            /* SEM `title`. O balão nativo do navegador é do NAVEGADOR, não do
               desenho: a v7 tem um `title` no arquivo inteiro e nenhum nos
               segmentos. Ele desenhava uma caixa branca por cima da faixa —
               visível na captura de produção — e o handoff diz por que não:
               "a leitura do mapa fica FORA da grade, em região viva; balão
               sobre grade some atrás do dedo no celular".

               Quem carrega a leitura é a legenda abaixo e o `aria-label` da
               faixa. Os dois dizem o mesmo, e melhor. */
            style={{
              // `flexBasis` proporcional em vez de `width`: com o `gap` entre
              // sete segmentos, larguras em porcentagem somariam mais que 100%
              // e o último seria cortado.
              flex: `${linha.pct} 1 0%`,
              background: AREA_VAR[area] ?? AREA_VAR.OU,
            }}
          />
        );
      })}
    </span>
  );

  if (!legenda) return barra;

  return (
    <div className={className}>
      {barra}
      {/* A legenda repete a ORDEM da faixa, e o ponto de cor fica ANTES do nome
          para que o olho ligue os dois sem procurar. O percentual vai em mono:
          é dado, e a mono é a textura de dado do sistema.

          `aria-hidden` porque a faixa acima já leva a mesma informação no
          `aria-label` — sem isso o leitor de tela ouviria os sete percentuais
          duas vezes seguidas. */}
      {/* FLUI EM LINHA, e não em grade — e a grade era minha, não do desenho.
          Medido no artboard `1b`: a legenda dele corre inline, cerca de dois
          itens por linha em 390px, com 6px de respiro vertical.

          Eu tinha trocado para grade de 1 → 2 → 3 colunas argumentando que o
          wrap deixava itens órfãos. O argumento vale em 1280; no CELULAR a
          grade de uma coluna empilha SETE linhas, mais que o dobro da altura
          do desenho — e essa foi a maior parcela do espaço morto da abertura.
          Otimizei a largura em que eu estava olhando e piorei a que importa. */}
      <ul
        aria-hidden="true"
        className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted"
      >
        {segmentos.map(({ area, ...linha }) => (
          <li key={linha.rotulo} className="flex items-center gap-2 whitespace-nowrap">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-control"
              style={{ background: AREA_VAR[area] ?? AREA_VAR.OU }}
            />
            {AREA_FULL_LABELS[area]}
            {/* `tabular-nums`: sem isso os percentuais dançam de linha para
                linha, porque o `1` da proporcional é mais estreito que os
                outros algarismos — e uma coluna de números desalinhada num
                produto que vende medição lê como desleixo. */}
            <span className="font-mono tabular-nums text-ink">{linha.pct.toFixed(0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
