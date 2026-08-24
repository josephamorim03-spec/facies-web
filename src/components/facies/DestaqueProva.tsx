import type { Prova } from "@/lib/provas";
import { Contagem } from "./Contagem";
import { BarrasArea } from "./BarrasArea";
import { dec } from "@/lib/decimal";

/**
 * O ENAMED em destaque na home.
 *
 * Por que ele vem antes do seletor de instituições: depois da convergência
 * regulatória, a prova de entrada da maioria dos candidatos é **uma só**. Uma
 * home que abre com uma lista de 141 bancas e não menciona o exame que quase
 * todo mundo vai prestar está organizada pela estrutura do acervo, não pela
 * pergunta de quem chegou.
 *
 * A leitura por instituição continua logo abaixo, porque quem presta USP ou
 * UNIFESP ainda depende dela — vira caso particular, não desaparece.
 *
 * O que este bloco NÃO faz: prometer. Ele mostra profundidade da base e o lift
 * sobre o acaso, que são fatos, e manda para a página onde os dois vêm com o
 * `n` ao lado.
 */
export function DestaqueProva({ prova }: { prova: Prova }) {
  const val = prova.validacao;

  return (
    <section className="rounded-surface border border-edge border-l-2 border-l-primary bg-surface">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-rule px-5 py-4 sm:px-6">
        <span className="paper-eyebrow">A prova que quase todo mundo presta</span>
      </div>

      <div className="px-5 py-6 sm:px-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h2 className="font-serif text-3xl font-semibold tracking-tight text-ink">
            {prova.sigla}
          </h2>
          <span className="text-sm text-muted">
            vale para o ENARE e para a 1ª etapa do Revalida
          </span>
        </div>

        {/* A ORDEM aqui é decisão de posicionamento, não de layout.

            Liderava com "2.034 questões rotuladas". O checklist de
            docs/product/positioning.md proíbe liderar com contagem, e a razão é
            precisa: contagem põe o produto no conjunto de comparação "banco de
            questões", onde o piso de mercado é R$29,90 e a assinatura fica cara.
            O conjunto certo é mentoria.

            O lift pode liderar porque não é sobre VOLUME, é sobre ACERTO DE
            PREVISÃO — o top-30 de assuntos acertou 35 das 91 questões da
            aplicação direta, contra 9,7% por acaso. Esse número pertence à
            conversa de mentoria ("isto prevê a sua prova"), não à de acervo.

            As contagens ficam: são a evidência que sustenta a leitura. Só
            deixam de ser a primeira coisa lida. */}
        <div className="mt-5 grid gap-px overflow-hidden rounded-control border border-rule bg-rule sm:grid-cols-3">
          {val.status === "medido" && val.lift ? (
            <div className="bg-paper p-4">
              <div className="font-mono text-2xl leading-tight text-primary">
                {dec(val.lift)}x
              </div>
              <div className="mt-0.5 text-sm text-muted">melhor que o acaso</div>
              {/* O `n` acompanha o número aqui também. Um lift de 4x sem a
                  ressalva de que a base direta é uma edição seria a mesma
                  precisão fabricada que a página inteira recusa. */}
              <div className="mt-2 font-mono text-micro text-muted">
                sobre {val.edicoes_diretas} aplicação direta
              </div>
            </div>
          ) : null}
          <div className="bg-paper p-4">
            <div className="font-mono text-2xl leading-tight text-ink">
              {prova.profundidade.subtemas_mapeados.toLocaleString("pt-BR")}
            </div>
            <div className="mt-0.5 text-sm text-muted">assuntos mapeados</div>
            <div className="mt-2 font-mono text-micro text-muted">
              {prova.formato.alternativas[0]?.n ?? "—"} alternativas por questão
            </div>
          </div>
          {/* ⚠️ ESTE NÚMERO PRECISA DIZER DE QUE ELE É FEITO.
              Antes eram três grandezas diferentes espalhadas pela tela, sem
              nada ligando uma à outra: "90 questões da aplicação direta" no
              painel de área, "9 aplicações" no chip e "2.031 questões
              rotuladas" aqui. Quem lê tenta reconciliar e não consegue — se são
              9 aplicações de uma prova de 100 questões, por que 2.031? A conta
              não fecha porque as 9 aplicações não são todas do ENAMED.

              A composição está no dado (`diretas` + `correlatas` = 2.031) e
              agora está na tela. Deliberadamente NÃO divido por aplicação: é a
              divisão que o leitor tenta fazer e que produz um número errado,
              porque as correlatas não têm o mesmo tamanho de caderno. */}
          <div className="bg-paper p-4">
            <div className="font-mono text-2xl leading-tight text-ink">
              {prova.profundidade.questoes_rotuladas.toLocaleString("pt-BR")}
            </div>
            <div className="mt-0.5 text-sm text-muted">questões rotuladas</div>
            <div className="mt-2 font-mono text-micro text-muted">
              {prova.profundidade.diretas} do {prova.sigla} ·{" "}
              {prova.profundidade.correlatas.toLocaleString("pt-BR")} de provas
              correlatas
            </div>
          </div>
        </div>

        {/* O QUE SÃO AS "PROVAS CORRELATAS", em uma frase.
            Sem isto o número de cima é um salto de fé: o leitor vê 2.031
            aparecer numa prova que teve UMA aplicação e conclui, com razão, que
            alguém inflou a contagem. A explicação é curta e verificável, e a
            página que vende medição não pode ter um número que ela não explica.

            Gerada do dado (`base.correlatas`), não escrita à mão: se a lista de
            fontes mudar no gerador, a frase acompanha em vez de virar mentira. */}
        {prova.base.correlatas.length > 0 ? (
          <p className="mt-4 max-w-[62ch] text-sm text-muted">
            O {prova.sigla} teve {prova.profundidade.aplicacoes_diretas} aplicação até
            agora, então a leitura soma as provas que ele substituiu —{" "}
            {prova.base.correlatas.map((c) => c.nome).join(" e ")} —, que seguem a mesma
            matriz e entram com peso menor no cálculo.
          </p>
        ) : null}

        {/* A DISTRIBUIÇÃO POR ÁREA VEM JUNTO, e a falta dela era um defeito
            visível em produção.

            O ENAMED é a seleção PADRÃO do seletor. Enquanto este componente
            mostrava só os três números e a contagem regressiva, quem abria a
            página não via relatório nenhum — a distribuição só aparecia depois de
            clicar numa institucional, que é o oposto de pôr a isca na primeira
            tela. Medido em produção: seleção ENAMED renderizava 0 painéis
            contra os 4 de qualquer banca.

            SÓ este painel atravessa, e não o relatório inteiro. `Prova` e
            `Banca` parecem próximas e não são:

              areas.linhas   {rotulo, qtd, pct}     ≡ {rotulo, n, pct}   ✅ mapeia
              mais_cai       score PONDERADO (11,8)  vs contagem crua     ❌ não
              leitura        não existe na prova                          ❌ não

            Empurrar `mais_cai` para o mesmo renderizador faria um score
            ponderado ser lido como número de questões — inventaria precisão que
            o dado não tem, que é o defeito que esta página menos pode ter. A
            leitura profunda do ENAMED continua em `/prova/[slug]`. */}
        <section aria-labelledby="destaque-areas" className="mt-6 border-t border-rule pt-6">
          <div className="mb-4 flex flex-wrap items-baseline gap-x-3">
            <span className="paper-eyebrow">Distribuição por área</span>
            <h3 id="destaque-areas" className="sr-only">
              Distribuição por área do {prova.sigla}
            </h3>
            {/* ⚠️ A BASE DESTE PAINEL É 90, E NÃO AS 2.031.

                A primeira versão desta legenda dizia "2.031 questões rotuladas",
                que é `profundidade.questoes_rotuladas` — o total da SÉRIE inteira,
                somando as correlatas. Mas `areas.linhas` soma exatamente 90, que
                é `base.direta.questoes`: a distribuição por área é medida só na
                aplicação direta do ENAMED.

                Pendurar o número grande numa medida feita sobre o pequeno é a
                precisão fabricada que esta página existe para recusar — e a
                conta desmentia a legenda em qualquer célula (37% de 2.031 não dá
                33). Peguei no screenshot, não no tipo: os dois números são
                `number` e nada no compilador reclamaria. */}
            <span className="text-sm text-muted">
              {prova.base.direta.questoes} questões da aplicação direta
            </span>
          </div>
          <BarrasArea
            linhas={prova.areas.linhas.map((linha) => ({
              rotulo: linha.rotulo,
              n: linha.qtd,
              pct: linha.pct,
            }))}
          />
        </section>

        <Contagem
          sigla={prova.sigla}
          aplicacao={prova.aplicacao_prevista}
          cadernos={prova.cadernos_previstos}
          aplicacoesDiretas={prova.profundidade.aplicacoes_diretas}
        />

        {/* O BOTÃO SAIU DAQUI, e não virou link discreto: ele DUPLICAVA.
            Com o ENAMED selecionado a página tinha "Ver a fácies do ENAMED"
            cheio, aqui dentro, e logo abaixo "Abrir a página do ENAMED" em
            texto — dois caminhos para o mesmo destino, um deles quase invisível.
            O CTA agora é único e mora no seletor, que é quem sabe se o alvo é
            prova ou banca. */}
      </div>
    </section>
  );
}
