import { RotuloSecao } from "./RotuloSecao";
import type { Prova } from "@/lib/provas";
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
 * afirmação é sobre quantas questões foram ANALISADAS, e essa é a série.
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

const MEDIDAS: { nome: string; porque: string }[] = [
  {
    nome: "Tamanho do enunciado",
    porque: "Caso longo exige raciocínio; enunciado curto exige leitura rápida do comando.",
  },
  {
    nome: "Pede a alternativa errada?",
    porque: "“Assinale a incorreta” muda completamente o que vale treinar.",
  },
  {
    nome: "Quantidade de negações",
    porque: "“Não”, “sem”, “exceto” — o maior produtor de erro por leitura apressada.",
  },
  {
    nome: "Tem imagem?",
    porque: "Foto, traçado, exame. Estudar só por texto prepara mal para prova de imagem.",
  },
  {
    nome: "Quantos dados clínicos",
    porque: "Quantas informações a questão dá — e quantas existem só para confundir.",
  },
  {
    nome: "Alternativas parecidas",
    porque: "Diagnósticos próximos entre si. É onde erra quem sabe a matéria.",
  },
  {
    nome: "Formato da resposta",
    porque: "Alternativa direta, combinação de assertivas, verdadeiro ou falso.",
  },
  {
    nome: "O que a questão pede",
    porque:
      "Diagnóstico, conduta, rastreio — e se cobra primeira, segunda ou terceira linha.",
  },
  {
    nome: "O assunto exato",
    porque: "Não “SOP”, mas “SOP em quem quer engravidar”. É esse nível que muda o estudo.",
  },
];

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

export function SecaoNoveMedidas({ prova }: { prova?: Prova | null }) {
  const analisadas = prova?.profundidade.questoes_rotuladas ?? null;

  return (
    <section className="sec">
      <div className={CONT_LANDING}>
        <RotuloSecao numero="03">o que ninguém mede</RotuloSecao>
        <h2 className="mt-3 max-w-[22ch] font-serif font-semibold text-ink">
          Você não presta “residência”. Você presta uma prova.
        </h2>
        <p className="max-w-[62ch] text-base text-muted">
          E cada uma tem cara própria. Uma cobra caso clínico longo e quase nunca pede a
          alternativa errada. A outra é enunciado curto, e uma em cada cinco questões pede
          “assinale a incorreta”. Quem treina para a média das provas treina errado
          justamente nas últimas semanas.
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
            valor={String(MEDIDAS.length)}
            rotulo="medidas em cada questão"
            nota="Do tamanho do enunciado à proximidade entre as alternativas."
          />
          {analisadas ? (
            <Numero
              valor={analisadas.toLocaleString("pt-BR")}
              rotulo="questões já analisadas"
              nota={`Do próprio ${prova?.sigla} e das provas que ele substituiu.`}
            />
          ) : null}
          <Numero
            valor="0"
            rotulo="videoaulas"
            nota="Não vendemos conteúdo. Vendemos saber onde aplicar o que você já estuda."
          />
        </div>

        <ul className="mt-10 grid gap-x-8 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
          {MEDIDAS.map((medida, indice) => (
            <li key={medida.nome}>
              {/* O número da medida é ordinal, não quantidade — vai em mono e
                  em `marcaViva`, o mesmo tratamento do número de seção. */}
              <div className="flex items-baseline gap-2">
                <span aria-hidden="true" className="font-mono text-micro text-marcaViva">
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <h3 className="font-serif font-semibold text-ink">{medida.nome}</h3>
              </div>
              <p className="mt-1 text-sm text-muted">{medida.porque}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
