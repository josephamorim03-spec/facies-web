import type { Metadata } from "next";
import { RedirectIfAuthenticated } from "./_components/RedirectIfAuthenticated";
import { FunilHome } from "./_components/FunilHome";
import { DepoisDeEntrar } from "@/components/facies/DepoisDeEntrar";
import { bancasEmDestaque, janelaNacional, NACIONAL, todasAsBancas } from "@/lib/facies";
import { todasAsProvas } from "@/lib/provas";
import { SITE_NAME, SITE_QUALIFICADOR } from "@/lib/site";
import { CabecalhoPublico } from "@/components/facies/CabecalhoPublico";

/**
 * A home É a Fácies (§12.1).
 *
 * Não existe landing com hero decorativo e o produto três rolagens abaixo: o
 * visitante chega por link compartilhado em grupo, com intenção específica e
 * paciência de segundos.
 *
 * Server component e estática: nenhuma consulta ao banco em tempo de requisição.
 * O tráfego é pico de WhatsApp e a primeira impressão do funil inteiro não pode
 * ser uma tela de erro.
 *
 * ## O RITMO É INFORMAÇÃO, e ele estava chapado
 *
 * Todas as seções usavam `mt-12`, o mesmo cartão e o mesmo rótulo de 11px. Sete
 * blocos de peso idêntico não têm clímax — a página lia como documento, que é
 * exatamente a queixa. A escala agora tem três degraus e eles significam coisas
 * diferentes:
 *
 *   `mt-10`            dentro de um ato — as partes de um mesmo argumento
 *   `mt-20 sm:mt-24`   entre atos, sempre com filete: um assunto novo começa
 *   `mt-16`            antes do rodapé, que não é ato
 *
 * Nenhuma afirmação nova entrou junto. O que muda é hierarquia, não conteúdo —
 * as guardas de CDC art. 30/37 e CONAR art. 27 continuam valendo linha a linha.
 */

const DESCRICAO =
  "Toda prova tem uma cara. Veja como a sua banca cobra: o formato das questões, o que mais cai e a distribuição por área. Grátis, sem cadastro.";

export const metadata: Metadata = {
  // Sem `title` de propósito: a home herda o default do layout, que já é a
  // marca com o qualificador. Repetir aqui daria "Fácies — inteligência de
  // prova · Fácies".
  description: DESCRICAO,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_QUALIFICADOR}`,
    description: DESCRICAO,
    url: "/",
  },
};

/** O filete de ato. Não leva rótulo: as seções que ele abre já começam com um
 *  (`Depois de entrar`) ou com a própria frase da cena, e empilhar rótulo sobre
 *  rótulo é o ruído que a página já tinha demais. */
const ATO = "mt-20 border-t border-rule pt-10 sm:mt-24";

export default function Home() {
  const destaques = bancasEmDestaque();
  const provaEmDestaque = todasAsProvas()[0];
  const total = todasAsBancas().length;
  const janela = janelaNacional();

  return (
    <>
      <RedirectIfAuthenticated />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <CabecalhoPublico />

        {/* ── Tese ────────────────────────────────────────────────────── */}
        <header className="pt-10 sm:pt-14">
          <span className="paper-eyebrow">
            Grátis, sem cadastro
          </span>
          {/* A quebra é DECLARADA, não sorteada pela medida.
              Antes: `max-w-[19ch]` com uma frase de 26 caracteres. A largura
              decidia onde cortar, e caía antes de "fácies." — a palavra que
              carregava o sentido ficava órfã na segunda linha, e a primeira
              lia como enchimento.

              A frase também mudou. "A sua prova tem uma fácies" usa o termo
              antes de ensiná-lo, e `fácies` é invariável: na fala clínica se diz
              "a fácies do paciente", quase nunca "tem uma fácies". Soava
              estranho porque é uma construção que ninguém usa.

              Agora ensina a metáfora em fala comum e só depois entrega. E não
              repete o qualificador do cabeçalho, que já diz "a cara da sua
              prova" no topo de toda página pública — repetir seria eco.

              DUAS COISAS MUDARAM AQUI, e as duas são medidas:

              1. `cara` recebe `text-marca`, que é o token do `á` de Fácies e de
                 mais nada (`FaciesWordmark.tsx`, e o porquê do valor está em
                 globals.css). "Fácies" É "cara" na fala clínica, então a cor
                 amarra a palavra ao logotipo e ensina a metáfora sem uma linha
                 de explicação. Uma vez só: o "a" de "Esta é a da sua" fica em
                 tinta, porque duas palavras coloridas na mesma frase viram
                 decoração e a marca deixa de ser sinal. Contraste não é risco —
                 `--color-marca` já está na lista FOREGROUND do
                 `check-contrast-tokens.mjs`, cruzada contra todo fundo a 4,5:1.

              2. A ENTRELINHA VINHA DE `sm:text-5xl`, E NÃO DE `leading-*`.

                 O sintoma: em 1280px a descendente do "p" de "prova" caía sobre
                 o agudo do "é" de "Esta" e as duas tintas se TOCAVAM, formando
                 um borrão só.

                 A causa não é a que parece. `text-5xl` do Tailwind declara
                 tamanho E entrelinha (`line-height: 1`), e o utilitário
                 responsivo é emitido DEPOIS de `leading-*` na folha — então
                 `sm:text-5xl` ganhava e a linha ficava em 1,0 a partir de 640px.
                 O `leading-tight` que estava escrito aqui nunca chegou a valer
                 no desktop, e trocá-lo por `leading-[1.3]` também não mudou nada:
                 medido coluna a coluna, a folga continuou ZERO. A classe estava
                 na marcação, a regra estava na folha, e mesmo assim o navegador
                 usava outro valor.

                 A forma `text-5xl/[1.45]` põe as duas propriedades no MESMO
                 utilitário, então não há o que sobrescrever em nenhuma largura.

                 O valor é medido: 1,38 é o mínimo que separa as tintas, 1,45 é o
                 que deixa luz entre elas, e a 48px ainda lê como display. Não é
                 gosto por entrelinha larga — é que o português empilha acento
                 sobre descendente, e a entrelinha de display de uma fonte
                 desenhada para o inglês não reserva espaço para isso.

                 ⚠️ Quem apertar de volta: meça a coluna do "é", e confira o
                 valor COMPUTADO no navegador, não a classe no JSX. */}
          {/* O ESPAÇO ANTES DE "cara" É INQUEBRÁVEL, e isso é do mesmo problema
              que o resto deste bloco.

              A 390px a frase caía como "Toda prova tem uma / cara. / Esta é a da
              sua." — a palavra colorida sozinha numa linha. É exatamente a órfã
              que o comentário acima descreve ter custado a versão anterior do
              título, só que pior: ali a palavra órfã era da cor da tinta, aqui
              ela é a única em petróleo da página. Órfã colorida não lê como
              ênfase, lê como erro de composição.

              `&nbsp;` amarra "uma" a "cara" e força a quebra a acontecer antes
              das duas. Não é `text-balance`: aquele deixa a decisão com o
              navegador, e o que precisa de garantia aqui é que a palavra da
              marca NUNCA comece uma linha sozinha.

              Medido em 390px e 1280px, tema claro e escuro. */}
          <h1 className="mt-3 max-w-[26ch] font-serif text-4xl/[1.45] font-semibold tracking-tight text-ink sm:text-5xl/[1.45]">
            Toda prova tem uma&nbsp;<span className="text-marcaDisplay">cara</span>.{" "}
            <span className="block">Esta é a da sua.</span>
          </h1>
          <p className="mt-4 max-w-[56ch] text-lg text-muted">
            Escolha a sua e veja como ela cobra: o formato das questões, o que mais cai e a
            distribuição por área.
          </p>
          {/* A linha abaixo existe porque a de cima descreve só a parte
              GRATUITA. Sem ela, quem chega pelo link do grupo lê a página
              inteira sem saber se isto é banco de questões, curso ou planner —
              a resposta só aparecia cinco telas abaixo, na ponte.

              "o que a sua banca mais cobra" é INCIDÊNCIA, e é verificável:
              `_apply_target_demand` pesa cada nó pela demanda das instituições-alvo
              do aluno, e essa demanda ganha da global no ranking. Não confundir
              com FORMATO do item, que não é filtrado — ver o comentário em
              `PonteDiagnostico.tsx`. */}
          <p className="mt-3 max-w-[56ch] text-lg text-ink">
            Depois, ela escolhe o que você treina hoje pelo que a sua banca mais cobra, no
            tempo que a sua escala de plantão deixa.
          </p>
          {/* Âncora, e não um segundo botão cheio.
              O cartão do ENAMED, com o único primário do primeiro ato, fica uma
              polegada de rolagem abaixo. Um segundo preenchido aqui recriaria a
              disputa de hierarquia que `PonteDiagnostico.tsx` já registra ter
              custado caro. O que faltava não era ênfase, era dizer que existe
              coisa abaixo — quem chega de link não sabe que a página rola. */}
          <p className="mt-6 text-sm text-muted">
            <a href="#seletor" className="text-primary underline underline-offset-4">
              Verifique a sua banca ↓
            </a>
          </p>
        </header>

        {/* ── A base, antes do argumento ───────────────────────────────
            Estes três números viviam no RODAPÉ e dentro do cartão do ENAMED —
            isto é, depois da decisão de rolar ou fechar. Quem chega lê a tese e
            não recebe nenhuma evidência de que existe trabalho por trás dela.

            Filete, e não cartão: a página já tem sete superfícies com borda, e
            mais uma diluiria todas. Numeral em mono é a textura de dado do
            sistema, e é o que faz a faixa ler como medição em vez de banner.

            O LIFT NÃO ENTRA AQUI, e a razão é dupla. Ele é a manchete do cartão
            do ENAMED, que fica logo abaixo — o mesmo "4,0x" duas vezes em uma
            tela lê como erro de revisão, ainda mais numa página cujo argumento é
            rigor. E ele não é fato de BASE: é uma afirmação sobre poder de
            previsão, que só se sustenta colada ao seu `n`.

            A janela ocupa o lugar dele porque responde a pergunta que vem logo
            depois de "quanto": de quando é isto. O rodapé mantém a frase
            completa, com o critério dos 120 — a faixa é a manchete, o rodapé é a
            letra miúda. */}
        <section
          aria-label="A base desta leitura"
          className="mt-10 grid gap-6 border-y border-rule py-5 sm:grid-cols-3"
        >
          <div>
            <div className="font-mono text-2xl leading-tight text-ink">
              {NACIONAL.total.toLocaleString("pt-BR")}
            </div>
            <div className="mt-0.5 text-sm text-muted">questões de prova lidas</div>
          </div>
          <div>
            <div className="font-mono text-2xl leading-tight text-ink">{total}</div>
            <div className="mt-0.5 text-sm text-muted">bancas com base suficiente</div>
          </div>
          {janela ? (
            <div>
              <div className="font-mono text-2xl leading-tight text-ink">{janela}</div>
              <div className="mt-0.5 text-sm text-muted">a janela que a leitura cobre</div>
            </div>
          ) : null}
        </section>

        {/* A leitura por INSTITUICAO vem depois da prova nacional, e nao some:
            quem presta USP ou UNIFESP ainda depende dela. Virou caso
            particular, que e o que o pivo do §1.5 diz.

            O seletor, a ponte e o gate de e-mail vivem em `FunilHome` porque os
            tres dependem de QUAL banca esta na tela. As secoes abaixo passam
            como `children` e continuam server components — a home tem trafego
            de pico, e conteudo estatico nao precisa ir para o bundle. */}
        <div className="mt-10">
          <FunilHome bancas={destaques} prova={provaEmDestaque}>
            <div className={ATO}>
              <DepoisDeEntrar />
            </div>

            {/* ── O que é e o que não é (§1.2) ─────────────────────────────── */}
            <section className="mt-10 grid gap-px overflow-hidden rounded-surface border border-edge bg-edge sm:grid-cols-2">
              <div className="bg-surface p-5 sm:p-6">
                <span className="paper-eyebrow">
                  É
                </span>
                <ul className="mt-3 grid gap-2 text-sm text-ink">
                  <li>Uma camada de decisão sobre o esforço de questões que você já faz</li>
                  {/* "incidência", e não "forma": o motor escolhe pelo que a banca
                      COBRA (target_bank_demand_score), não pelo formato do item,
                      que não é filtrado. Ver PonteDiagnostico.tsx. */}
                  {/* "com o número que sustenta" SAIU. A evidência por nó
                      (target_demand_evidence) não chega à tela — ver a nota em
                      PonteDiagnostico.tsx. O que sobrevive é a orientação por
                      prova-alvo via _target_relevance, que roda sem flag.
                      Meu próprio guard não pegou esta: o padrão procurava a
                      frase completa ("cobrou isso em N das últimas"), e esta era
                      a versão curta da mesma promessa. */}
                  <li>
                    Especialista no que a <em>sua</em> prova-alvo cobra, e diz quando foi por
                    isso que a questão apareceu
                  </li>
                  <li>Um planejador que respeita escala de plantão</li>
                  {/* A regra da IA tem DUAS metades, e as duas são obrigatórias:
                      nunca dizer que não usamos (seria falso e detectável), e nunca
                      vender por isso. Vendemos julgamento, não modelo. */}
                  <li>
                    Movida a IA por baixo — que não aparece na tela, e não é o que você compra
                  </li>
                </ul>
              </div>
              <div className="bg-surface p-5 sm:p-6">
                <span className="paper-eyebrow">
                  Não é
                </span>
                <ul className="mt-3 grid gap-2 text-sm text-muted">
                  <li>Fonte de conteúdo teórico</li>
                  <li>Mais um extensivo</li>
                  <li>Cronograma genérico de 12 meses</li>
                  {/* Bandeira, não omissão. Estudos controlados em educação em
                      saúde não acharam benefício de gamificação competitiva;
                      ranking aumenta ansiedade sem melhorar resultado, e um
                      quase-experimento longitudinal achou menos prática e notas
                      menores. Fontes em docs/product/positioning.md. */}
                  <li className="text-ink">
                    Um ranking — preparação para residência já tem comparação de sobra
                  </li>
                </ul>
              </div>
            </section>

            {/* ── Objeções ────────────────────────────────────────────────
                Quatro objeções REAIS, respondidas em uma frase cada.

                A página tratava objeção só por omissão — dizia o que o produto
                é e o que não é, e deixava a dúvida de quem já paga um cursinho
                sem resposta nenhuma. Quem chega por link de grupo chega com
                essas quatro na cabeça, e uma delas basta para fechar a aba.

                Nenhuma promete: a primeira reconhece o cursinho em vez de
                atacá-lo, a segunda aponta para a leitura que já está aberta
                acima, a terceira compara com banco de questões pelo que a
                Fácies faz a MAIS (e não pelo preço, que não existe aqui), e a
                quarta descreve o planejador que o motor de fato tem. */}
            <section className="mt-10">
              <span className="paper-eyebrow">
                O que costumam perguntar antes de assinar
              </span>
              <h2 className="mt-3 font-serif text-2xl font-semibold text-ink">
                Quatro objeções, sem rodeio
              </h2>
              <div className="mt-5 grid gap-px overflow-hidden rounded-surface border border-edge bg-edge sm:grid-cols-2">
                {[
                  {
                    q: "Já pago um cursinho.",
                    r: "Exatamente. A Fácies não substitui o extensivo — ela mostra onde aplicar o que você já está aprendendo, na ordem que a sua prova cobra.",
                  },
                  {
                    q: "Todo mundo diz que é personalizado.",
                    r: "Por isso não pedimos que você acredite. A leitura da sua prova está aberta aqui em cima, inteira e sem cadastro.",
                  },
                  {
                    q: "Banco de questões eu acho de graça.",
                    r: "Questão qualquer um tem. Saber que a sua prova cobra Cirurgia dez pontos acima da média das outras, não.",
                  },
                  {
                    q: "Não tenho tempo.",
                    r: "O sistema parte disso. O plantão é detectado no calendário, e em dia de escala longa a sessão encolhe em vez de acumular dívida.",
                  },
                ].map((item) => (
                  <div key={item.q} className="bg-surface p-5 sm:p-6">
                    <q className="block font-serif text-lg leading-snug text-ink">
                      {item.q}
                    </q>
                    <p className="mt-3 text-sm leading-6 text-muted">{item.r}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* ── Acesso ──────────────────────────────────────────────────
                O NÚMERO SAIU DAQUI DE PROPÓSITO, e repor exige checkout no ar.

                Esta seção anunciava R$ 590/ano, R$ 69/mês e "reembolso integral
                em 7 dias" — de um produto que não tem como ser comprado: a ponte
                manda para `/login`, que termina em `/ativar-acesso`, que pede uma
                chave de mentor.

                Oferta suficientemente precisa VINCULA o fornecedor (CDC art. 30) e
                permite exigir cumprimento forçado (art. 35). Somava-se CONAR art.
                27: alegação sobre dado objetivo tem de ser comprovável.

                `ativar-acesso/page.tsx` já tinha a regra escrita e certa — "nenhuma
                promessa de preço, de data ou de venda, porque anúncio vira
                obrigação". Era esta página que a violava.

                A cunha abaixo FICA: descrever para quem o produto é não é oferta,
                e é o que faz quem não é desta fase economizar a leitura. */}
            <section className="mt-10">
              <h2 className="font-serif text-2xl font-semibold text-ink">Acesso</h2>
              {/* A cunha: quem não é desta fase economiza a leitura, e quem é
                  reconhece que a página está falando com ele. Restringir aqui
                  afasta quem pediria reembolso — o que vale mais que a assinatura
                  perdida, e vale igual antes de existir preço para pedir de volta. */}
              <p className="mt-3 max-w-[58ch] text-base text-muted">
                A Fácies é para quem estuda em janela irregular — plantão, pós-plantão, noite
                curta — e está em <span className="text-ink">consolidação e revisão</span>, não
                em primeiro aprendizado. Questão não ensina do zero: para primeiro contato,
                videoaula é melhor. A teoria vem de fora por desenho; você já tem o conteúdo,
                e a Fácies diz o que fazer com ele.
              </p>
              {/* Só o que é VERDADE hoje. Sem preço, sem data, sem "em breve" —
                  "em breve" é promessa de prazo e cria a mesma obrigação que o
                  número criava.

                  Este cartão fecha o `children`, e logo abaixo dele o `FunilHome`
                  põe o gate de e-mail. A adjacência é a razão da ordem nova: "o
                  app ainda não está aberto" é a pergunta, e "saber quando a
                  Fácies abrir" é a resposta. */}
              <div className="mt-4 rounded-surface border border-edge bg-surfaceMuted p-5 sm:p-6">
                <p className="text-base text-ink">
                  O app ainda não está aberto para assinatura.
                </p>
                <p className="mt-2 max-w-[58ch] text-sm text-muted">
                  A leitura da sua prova, acima, é gratuita e não depende disso — ela é o que
                  está pronto, e continua sendo. Quando a assinatura abrir, as condições
                  aparecem aqui.
                </p>
              </div>
            </section>
          </FunilHome>
        </div>

        {/* ── Rodapé honesto: mantenha, não suavize (§13) ────────────────
            A frase da base FICA aqui, mesmo com os números repetidos na faixa do
            topo. Ela carrega o critério — "pelo menos 120 questões classificadas
            nos últimos anos" — e a faixa não tem espaço para ele sem virar
            parágrafo. Manchete em cima, letra miúda embaixo; tirar a de baixo
            seria trocar precisão por economia de linha. */}
        <footer className="mt-16 border-t border-rule pt-8 text-sm text-muted">
          <p className="max-w-[70ch]">
            A Fácies não promete aprovação e não vende conteúdo teórico. Ela mostra como a sua
            banca cobra e organiza o seu tempo em volta disso.
          </p>
          <p className="mt-4 max-w-[70ch]">
            Base atual: {total} bancas com pelo menos 120 questões classificadas nos últimos
            anos, sobre {NACIONAL.total.toLocaleString("pt-BR")} questões de prova.
          </p>
        </footer>
      </main>
    </>
  );
}
