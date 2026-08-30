import { QuestaoAnotada } from "./QuestaoAnotada";
// ⚠️ O valor vem do módulo NÃO-cliente. Importado de `QuestaoAnotada`, que é
// `"use client"`, o Next entrega ao servidor um proxy que se serializa como
// texto de erro — e foi isso que o painel exibiu em 40px. Tipo pode cruzar a
// fronteira; valor, não.
import { TOTAL_DE_MARCAS, type DadosDoAcervo } from "./medidasDaQuestao";
import { RotuloSecao } from "./RotuloSecao";
import { NACIONAL, TOTAL_BANCAS, extremoNacionalDoFormato } from "@/lib/facies";
import { ROTULO_FORMATO } from "@/lib/provas";
import { CONT_LANDING } from "@/lib/site";

/**
 * Seção "o que ninguém mede": as nove dimensões de forma.
 *
 * A manchete é a que o guia de texto manda usar AQUI e em nenhum outro lugar:
 * "você não presta 'residência' — você presta uma prova" foi descartada para o
 * topo por ser combativa demais, e recomendada para a abertura deste bloco,
 * "onde ela tem contexto para não soar arrogante".
 *
 * ## OS NÚMEROS SÃO DO ACERVO, e não mais do ENAMED
 *
 * Esta seção mostrava a fácies de uma prova específica: "100% múltipla escolha
 * direta em 90 questões de 2026", "291 assuntos em 1.717 questões da série". Era
 * um laudo do ENAMED no meio de uma home que não é sobre o ENAMED — e pior, num
 * bloco cuja tese é justamente que a média não serve para ninguém e que cada
 * prova tem cara própria.
 *
 * O que a seção precisa provar aqui não é a cara de UMA prova: é que a medição
 * existe, e em que escala. Por isso os valores passam a ser do acervo inteiro,
 * com o extremo ao lado — é o extremo que transforma "7,3% pedem a incorreta" de
 * média morna em prova de que as provas divergem. A fácies de cada prova
 * continua sendo o que as páginas de destino entregam, uma por prova.
 *
 * ## O número da seção NÃO é escrito aqui
 *
 * Ele chega por prop, de `app/page.tsx`, onde a ordem das seções é uma lista só.
 * Escrito à mão em cada componente, ele já deixou um buraco: a seção 01 foi
 * removida do fluxo e a página passou a numerar 02, 03, 04, 05 — começando no
 * dois, sem nada explicando por quê.
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
 * O que o acervo mede, montado no SERVIDOR e passado pronto.
 *
 * `QuestaoAnotada` é client component (tem estado de hover e de eixo). Se ela
 * importasse `@/lib/facies` para buscar a régua, os 797 KB de `facies.json`
 * entrariam no bundle do navegador para render três números. A fronteira certa é
 * esta: o servidor lê o dataset, o cliente recebe os valores.
 */
function dadosDoAcervo(): DadosDoAcervo {
  const distribuicao = Object.entries(NACIONAL.formato_pct);
  const dominante = distribuicao.reduce<[string, number] | null>(
    (maior, linha) => (maior == null || linha[1] > maior[1] ? linha : maior),
    null,
  );

  return {
    base: NACIONAL.total,
    bancas: TOTAL_BANCAS,
    incorreta: {
      // AUSENTE É ZERO, e é essa a leitura que faltava: o gerador não emite
      // linha para o formato que não ocorreu.
      pct: NACIONAL.formato_pct.pede_incorreta ?? 0,
      extremo: extremoNacionalDoFormato("pede_incorreta"),
    },
    dominante: dominante
      ? { rotulo: ROTULO_FORMATO[dominante[0]] ?? dominante[0], pct: dominante[1] }
      : null,
  };
}

export function SecaoNoveMedidas({ numero }: { numero: string }) {
  const dados = dadosDoAcervo();
  const fmt = (valor: number) =>
    `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

  return (
    <section className="sec">
      <div className={CONT_LANDING}>
        <RotuloSecao numero={numero}>o que ninguém mede</RotuloSecao>
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
          {dados.incorreta.extremo ? (
            <>
              em outra, <span className="font-mono">{fmt(dados.incorreta.extremo)}</span> das
              questões pedem “assinale a incorreta” — contra{" "}
              <span className="font-mono">{fmt(dados.incorreta.pct)}</span> nas{" "}
              {dados.base.toLocaleString("pt-BR")} questões com o formato lido.
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
          {/* ⚠️ O RÓTULO REPETE, PALAVRA POR PALAVRA, a frase da prosa acima —
              "questões com o formato lido". Não é descuido de redação: é a
              mesma base, e dar dois nomes à mesma base foi exatamente o defeito
              que fez esta página exibir 90 e 1.717 sob frases quase iguais.
              Quem desconfia de um número desconfia dos outros oito. */}
          <Numero
            valor={dados.base.toLocaleString("pt-BR")}
            rotulo="questões com o formato lido"
            nota={`Em ${dados.bancas} bancas, de provas de todo o país.`}
          />
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
            deixa trocar o eixo entre a questao e o acervo.

            A diferenca nao e de enfeite. Listar nomes pede que o leitor
            acredite que medimos; mostrar as marcas no texto e o unico jeito de
            ele VER a medida acontecendo. Numa secao chamada "o que ninguem
            mede", a demonstracao e o argumento inteiro. */}
        <QuestaoAnotada dados={dados} />
      </div>
    </section>
  );
}
