import { ContagemGigante } from "./ContagemGigante";
import { RotuloSecao } from "./RotuloSecao";
import { dec } from "@/lib/decimal";
import type { Prova } from "@/lib/provas";
import { CONT_LANDING } from "@/lib/site";

/**
 * Seção 02 da v7 — "nossa aposta, por escrito". A faixa petróleo.
 *
 * ## As datas VÊM DO DATASET, e isso não é preciosismo
 *
 * A v7 escreve 13.09 e 15.09 à mão. Os dois já existem em
 * `provas.json` como `aplicacao_prevista` e `cadernos_previstos` — a v7 os
 * copiou de lá. As outras duas (registro e publicação) são derivadas: véspera
 * da prova e dia seguinte ao gabarito.
 *
 * Datas escritas à mão numa página estática envelhecem em silêncio: quando o
 * ENAMED 2027 entrar no dataset, uma seção inteira continuaria falando de
 * setembro de 2026 com toda a confiança, e o build passaria. Derivar faz a
 * seção seguir a base.
 *
 * ## Por que a conta MEDIDA entra numa seção sobre o futuro
 *
 * A v7 escreve esta seção inteira no futuro ("vamos guardar", "vamos publicar").
 * O guia de texto pede que toda frase passe em "é verdade hoje? Não 'vai ser' —
 * hoje", e uma seção 100% prospectiva não tem como passar: ela pede fé, que é
 * exatamente o que a pergunta 2 do mesmo teste reprova ("um cético leria isso e
 * diria 'prova'?").
 *
 * O que faz ela passar já existe medido em `validacao`: o método foi testado
 * contra provas passadas — 34 acertos em 90, contra um piso de 10,4% de uma
 * lista feita só por "o que mais caiu", em 8 medições. Isso não é a aposta; é a
 * evidência de que a aposta tem lastro. Uma linha, com o `n` ao lado, como o
 * §15.4 exige.
 *
 * ⚠️ O PEDIDO DE E-MAIL DA v7 NÃO ESTÁ AQUI, e a divergência é deliberada.
 * A v7 põe a captura dentro desta faixa. O `FunilHome` registra por escrito ter
 * MOVIDO o gate para o fim da página, depois das seções que provam o produto,
 * porque pedi-lo antes "gasta o interesse antes de mostrar o que se está
 * comprando". São duas decisões de conversão em conflito, as duas
 * fundamentadas, e essa é do dono do produto — não minha. Aqui ficou a âncora;
 * o gate continua um só, no fim.
 */

function maisDias(iso: string, dias: number): string {
  const [ano, mes, dia] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function curta(iso: string): string {
  const [, mes, dia] = iso.split("-");
  return `${dia}.${mes}`;
}

export function SecaoAposta({ prova }: { prova: Prova }) {
  const prevista = prova.aplicacao_prevista;
  const gabarito = prova.cadernos_previstos;
  // Véspera da prova e dia seguinte ao gabarito. A v7 diz "até 12 de setembro"
  // e "no dia 16"; com a base atual isso é exatamente -1 e +1.
  const registro = maisDias(prevista, -1);
  const publicacao = maisDias(gabarito, 1);

  const v = prova.validacao;
  const medido = v.status === "medido" ? v : null;

  const LINHA_DO_TEMPO = [
    { quando: curta(prevista), o_que: "Você faz a prova" },
    { quando: curta(gabarito), o_que: "O Inep divulga as questões e o gabarito" },
    {
      quando: curta(publicacao),
      o_que:
        "Publicamos a leitura da prova e a conta: quantos dos nossos caíram, e quantos uma lista feita só por “o que mais caiu nos últimos anos” teria acertado",
    },
  ];

  return (
    <section className="sec sec--marca">
      <div className={CONT_LANDING}>
        <RotuloSecao numero="02">nossa aposta, por escrito</RotuloSecao>
        <h2 className="mt-3 max-w-[26ch] font-serif font-semibold">
          Vamos dizer antes o que achamos que cai. E depois mostrar quanto erramos.
        </h2>
        <p className="apoio max-w-[62ch] text-base">
          Todo mundo promete acertar. Ninguém mostra a conta depois. Nós vamos guardar a
          nossa lista antes da prova, com data registrada, e publicar o resultado — inclusive
          o que ficou de fora.
        </p>

        {/* A COMPOSIÇÃO É A DA v7: à esquerda o que fica guardado e a linha do
            tempo; à direita a contagem gigante. Eu tinha empilhado tudo em
            largura cheia e trocado a contagem por um link — a informação
            chegava e a função se perdia, porque é o número crescendo que dá
            urgência à seção sem uma linha de texto. */}
        <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-6">
          {/* Véu, e não cartão sólido: dentro da faixa nenhuma superfície clara
              cheia, senão o bloco recorta um buraco e a faixa vira moldura. */}
          <div className="veu p-5 sm:p-6">
            <h3 className="paper-eyebrow">O que fica guardado</h3>
            <p className="mt-3 text-base">
              Os assuntos que consideramos mais prováveis no {prova.sigla}, fechados antes da
              prova. A classificação das questões depois é feita sem nenhum acesso a essa
              lista — é o que impede a conta de ser puxada a nosso favor.
            </p>
            <p className="apoio mt-4 border-t border-[color:var(--veu-borda)] pt-4 text-sm">
              Registro com data e código de verificação, publicado até {curta(registro)}.
            </p>
          </div>

          {medido ? (
            /* A EVIDÊNCIA, e ela é o que separa esta seção de uma promessa.
               Não é a aposta de 2026: é o mesmo método rodado contra provas
               que já aconteceram, com o n ao lado de cada número. */
            <div className="veu p-5 sm:p-6">
              <h3 className="paper-eyebrow">o método já foi testado assim</h3>
              <p className="mt-3 text-3xl font-mono">
                {medido.acertos} de {medido.de}
              </p>
              <p className="mt-1 text-base">
                assuntos acertados na última medição, contra {dec(medido.piso_pct)}% de uma
                lista feita só por “o que mais caiu”.
              </p>
              {/* O HISTÓRICO TEM STATUS PRÓPRIO, e ele não é o da validação.
                  `validacao.status` diz se ESTA medição saiu; `historico.status`
                  diz se há medições bastantes para uma mediana. Conferir só o
                  primeiro fazia o tipo prometer um campo que a variante
                  "insuficiente" não tem — e a mediana sairia `undefined` na
                  tela, que é o modo de falha que esta página inteira recusa. */}
              <p className="apoio mt-4 border-t border-[color:var(--veu-borda)] pt-4 text-sm">
                {medido.historico.status === "medido" ? (
                  <>
                    {medido.historico.medicoes} medições até aqui, com ganho mediano de{" "}
                    {dec(medido.historico.mediana)}× sobre essa lista.{" "}
                  </>
                ) : null}
                O grão é o {medido.grao}.
              </p>
            </div>
          ) : null}

            {/* A linha do tempo. `<ol>` porque a ordem É a informação, e a
                ÚLTIMA linha é a que importa — é onde a conta é publicada.
                A v7 marca só ela com `destaque`. */}
            <ol className="space-y-4">
              {LINHA_DO_TEMPO.map((etapa, indice) => {
                const ultima = indice === LINHA_DO_TEMPO.length - 1;
                return (
                  <li
                    key={etapa.quando}
                    className={`flex flex-col gap-1 sm:flex-row sm:gap-5 ${
                      ultima ? "border-l-2 border-[color:var(--veu-borda)] pl-4 sm:pl-5" : ""
                    }`}
                  >
                    <span className="shrink-0 font-mono text-base sm:w-16">{etapa.quando}</span>
                    <span
                      className={`max-w-[58ch] text-base ${ultima ? "" : "apoio"}`}
                    >
                      {etapa.o_que}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>

          {/* A coluna da contagem. `lg:w-auto` porque a `.gigante` define a
              própria largura — é o número que manda no espaço, não o contrário. */}
          <div className="lg:min-w-[18rem]">
            <ContagemGigante alvoIso={prevista} />
            <p className="mt-6 border-t border-[color:var(--veu-borda)] pt-5 text-base">
              <a href="#aviso" className="link-alvo underline underline-offset-4">
                Quero receber no dia {curta(publicacao)} ↓
              </a>
            </p>
            <p className="apoio mt-4 text-sm">
              Só escrevemos quando algo muda na sua prova. Umas cinco vezes por ciclo, no
              máximo.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
