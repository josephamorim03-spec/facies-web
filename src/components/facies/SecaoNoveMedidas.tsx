import { QuestaoAnotada } from "./QuestaoAnotada";
// ⚠️ O valor vem do módulo NÃO-cliente. Importado de `QuestaoAnotada`, que é
// `"use client"`, o Next entrega ao servidor um proxy que se serializa como
// texto de erro — e foi isso que o painel exibiu em 40px. Tipo pode cruzar a
// fronteira; valor, não.
import { TOTAL_DE_MARCAS, type DadosDaProva } from "./medidasDaQuestao";
import { RotuloSecao } from "./RotuloSecao";
import { NACIONAL, extremoNacionalDoFormato } from "@/lib/facies";
import { ROTULO_FORMATO, type Prova } from "@/lib/provas";
import { CONT_LANDING } from "@/lib/site";

/**
 * Seção 03 da v7 — "o que ninguém mede": as nove dimensões de forma.
 *
 * A manchete é a que o guia de texto manda usar AQUI e em nenhum outro lugar:
 * "você não presta 'residência' — você presta uma prova" foi descartada para o
 * topo por ser combativa demais, e recomendada para a abertura deste bloco,
 * "onde ela tem contexto para não soar arrogante".
 *
 * ## Os números são os REAIS, não os do desenho
 *
 * A v7 escreve "820 questões já analisadas" e se declara protótipo com números
 * ilustrativos. Aqui o número vem de `profundidade.questoes_rotuladas` — a
 * série inteira, que é exatamente o que a legenda da v7 descreve ("do próprio
 * ENAMED e das provas que ele substituiu"): as diretas mais as correlatas.
 *
 * ⚠️ NÃO trocar por `base.direta.questoes`. São medidas de coisas diferentes e
 * o repositório já registra o estrago de confundi-las: a distribuição por área
 * é medida só na aplicação direta, e pendurar o número da série numa conta
 * feita sobre o pequeno faz a legenda desmentir a própria célula. Aqui a
 * afirmação é sobre o tamanho da série, e o rótulo diz isso com essas
 * palavras.
 *
 * ⚠️ O rótulo NÃO pode voltar a ser "questões já analisadas": o herói usa uma
 * frase quase igual para as 90 da aplicação direta, e as duas juntas fizeram a
 * página exibir 90 e 1.717 sob o mesmo nome. Foi lido como erro de fora, e com
 * razão.
 *
 * ## O terceiro número do trio é uma decisão em aberto do design
 *
 * `facies-design-handoff.md` §7 lista, entre "o que falta decidir com olho, não
 * com código": *"se o trio mantém o terceiro item, que é uma alfinetada e
 * contradiz levemente a recomendação do banco gratuito"*. Ficou como a v7
 * escreveu. Vale saber o custo: a seção 04 ganha a força que tem por
 * RECOMENDAR o concorrente, e uma alfinetada duas seções antes cobra parte
 * dessa credibilidade adiantado.
 */


function Numero({
  valor,
  rotulo,
  nota,
}: {
  valor: string;
  rotulo: string;
  nota: string;
}) {
  return (
    <div>
      {/* 26px no celular, 40px a partir de 760px — a escala de `.numeros` da
          v7. `tabular-nums` porque estes números ficam empilhados numa grade:
          sem largura fixa de algarismo, as colunas não alinham e o painel lê
          como desleixo num produto cujo argumento é medição. */}
      <div className="font-mono text-[26px] leading-none tabular-nums text-ink sm:text-[40px]">
        {valor}
      </div>
      <div className="mt-2 text-base text-ink">{rotulo}</div>
      <p className="mt-1.5 text-sm text-muted">{nota}</p>
    </div>
  );
}

/**
 * O que a prova mede, montado no SERVIDOR e passado pronto.
 *
 * `QuestaoAnotada` é client component (tem estado de hover e de eixo). Se ela
 * importasse `@/lib/facies` para buscar a régua nacional, os 797 KB de
 * `facies.json` entrariam no bundle do navegador para render três números. A
 * fronteira certa é esta: o servidor lê o dataset, o cliente recebe os valores.
 */
function dadosDaProva(prova: Prova): DadosDaProva {
  const distribuicao = prova.formato.distribuicao;
  const base = prova.formato.base;
  const incorreta = distribuicao.find((linha) => linha.codigo === "pede_incorreta");
  const dominante = distribuicao.reduce<(typeof distribuicao)[number] | null>(
    (maior, linha) => (maior == null || linha.pct > maior.pct ? linha : maior),
    null,
  );
  const anos = prova.base.direta.anos;

  return {
    sigla: prova.sigla,
    diretas: base,
    // Só nomeia o ano quando há UMA aplicação direta. Com duas, "de 2026"
    // seria falso e "de 2025–2026" não cabe na linha — o rótulo genérico
    // cobre os dois casos sem mentir em nenhum.
    anoDireto: anos.length === 1 ? anos[0] : null,
    serie: prova.profundidade.questoes_rotuladas,
    subtemas: prova.profundidade.subtemas_mapeados,
    incorreta: {
      // AUSENTE É ZERO, e é essa a leitura que faltava: o gerador não emite
      // linha para o formato que não ocorreu, então `find` volta `undefined` —
      // que renderizado vira vazio em vez de "0%".
      pct: incorreta?.pct ?? 0,
      nacional: NACIONAL.formato_pct.pede_incorreta ?? 0,
      extremo: extremoNacionalDoFormato("pede_incorreta"),
    },
    dominante: dominante
      ? { rotulo: ROTULO_FORMATO[dominante.codigo] ?? dominante.codigo, pct: dominante.pct }
      : null,
  };
}

export function SecaoNoveMedidas({ prova }: { prova?: Prova | null }) {
  const dados = prova ? dadosDaProva(prova) : null;
  const incorretaNacional = NACIONAL.formato_pct.pede_incorreta ?? 0;
  const incorretaExtremo = extremoNacionalDoFormato("pede_incorreta");
  const fmt = (valor: number) =>
    `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

  return (
    <section className="sec">
      <div className={CONT_LANDING}>
        <RotuloSecao numero="03">o que ninguém mede</RotuloSecao>
        <h2 className="mt-3 max-w-[22ch] font-serif font-semibold text-ink">
          Você não presta “residência”. Você presta uma prova.
        </h2>
        {/* A FRASE PASSA A SER MEDIDA, e não ilustração.
            A v7 escrevia "uma em cada cinco questões pede assinale a incorreta"
            como exemplo hipotético. Ela é verdadeira — e o extremo real é
            maior. Publicar o número medido custa o mesmo que inventar um, e é a
            diferença entre a página afirmar que mede e mostrar a medida. */}
        <p className="max-w-[62ch] text-base text-muted">
          E cada uma tem cara própria. Umas quase nunca pedem a alternativa errada;{" "}
          {incorretaExtremo ? (
            <>
              em outra, <span className="font-mono">{fmt(incorretaExtremo)}</span> das
              questões pedem “assinale a incorreta” — contra{" "}
              <span className="font-mono">{fmt(incorretaNacional)}</span> nas{" "}
              {NACIONAL.total.toLocaleString("pt-BR")} questões com o formato lido.
            </>
          ) : (
            <>em outras, “assinale a incorreta” aparece o tempo todo.</>
          )}{" "}
          Quem treina para a média das provas treina errado justamente nas últimas
          semanas.
        </p>
        <p className="mt-4 max-w-[62ch] text-base text-muted">
          Tudo isto é medido questão por questão por um sistema automático, com o critério
          aberto. Não é opinião de quem passou nem lembrança de quem fez a prova.
        </p>

        {/* 2 colunas no celular e 4 no desktop — a grade de `.numeros`. Três
            colunas era a minha leitura, não a do desenho: com 2 no celular os
            números ficam lado a lado em vez de empilhados, e o trio lê como
            painel de medida em vez de lista. */}
        <div className="mt-10 grid grid-cols-2 gap-6 border-y border-rule py-6 sm:gap-7 lg:grid-cols-4">
          <Numero
            valor={String(TOTAL_DE_MARCAS)}
            rotulo="medidas em cada questão"
            nota="Do tamanho do enunciado ao assunto exato."
          />
          {dados ? (
            /* ⚠️ O RÓTULO MUDOU, e a mudança é a correção de um defeito real.
               Dizia "questões já analisadas" — a MESMA frase que o herói usa
               para as 90 da aplicação direta. Duas frases idênticas com 90 e
               1.717 na mesma página não leem como duas medidas; leem como erro,
               e quem desconfia de um número desconfia dos outros oito.

               "Questões da série" nomeia o que o número é. A nota abaixo nomeia
               de onde ela vem, gerada de `base.correlatas` e não escrita à mão:
               o ENAMED tem UMA edição, e dizer "1.717 analisadas" sem dizer que
               1.627 vêm do ENARE e do Revalida é deixar o leitor concluir que
               existem 19 provas que ele nunca viu. */
            <Numero
              valor={dados.serie.toLocaleString("pt-BR")}
              rotulo="questões da série"
              nota={
                prova && prova.base.correlatas.length > 0
                  ? `As ${dados.diretas} do ${dados.sigla} mais ${prova.base.correlatas
                      .map((correlata) => correlata.nome)
                      .join(" e ")}, que ele substituiu.`
                  : `Do próprio ${dados.sigla} e das provas que ele substituiu.`
              }
            />
          ) : null}
          <Numero
            valor="0"
            rotulo="videoaulas"
            nota="Não vendemos conteúdo. Vendemos saber onde aplicar o que você já estuda."
          />
        </div>

        {/* A LISTA DE NOMES VIROU A QUESTAO ANOTADA.

            O que estava aqui era uma grade com os nove nomes e o porque de
            cada um — correto e inerte. O desenho nao lista as medidas: ele as
            APLICA, numa questao de exemplo com as nove marcas em cima dela, e
            deixa trocar o eixo entre a questao e a prova.

            A diferenca nao e de enfeite. Listar nomes pede que o leitor
            acredite que medimos; mostrar as marcas no texto e o unico jeito de
            ele VER a medida acontecendo. Numa secao chamada "o que ninguem
            mede", a demonstracao e o argumento inteiro. */}
        {dados ? <QuestaoAnotada dados={dados} /> : null}
      </div>
    </section>
  );
}
