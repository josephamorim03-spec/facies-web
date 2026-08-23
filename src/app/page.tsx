import type { Metadata } from "next";
import { RedirectIfAuthenticated } from "./_components/RedirectIfAuthenticated";
import { DestaqueProva } from "@/components/facies/DestaqueProva";
import { FunilHome } from "./_components/FunilHome";
import { DepoisDeEntrar } from "@/components/facies/DepoisDeEntrar";
import { bancasEmDestaque, NACIONAL, todasAsBancas } from "@/lib/facies";
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

export default function Home() {
  const destaques = bancasEmDestaque();
  const provaEmDestaque = todasAsProvas()[0];
  const total = todasAsBancas().length;

  return (
    <>
      <RedirectIfAuthenticated />

      <main className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
        <CabecalhoPublico />

        {/* ── Tese ────────────────────────────────────────────────────── */}
        <header className="py-10 sm:py-14">
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
              prova" no topo de toda página pública — repetir seria eco. */}
          <h1 className="mt-3 max-w-[26ch] font-serif text-4xl font-semibold leading-tight tracking-tight text-ink sm:text-5xl">
            Toda prova tem uma cara.{" "}
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
        </header>

        {provaEmDestaque ? (
          <div className="mb-10">
            <DestaqueProva prova={provaEmDestaque} />
          </div>
        ) : null}

        {/* A leitura por INSTITUICAO vem depois da prova nacional, e nao some:
            quem presta USP ou UNIFESP ainda depende dela. Virou caso
            particular, que e o que o pivo do §1.5 diz.

            O seletor, a ponte e o gate de e-mail vivem em `FunilHome` porque os
            tres dependem de QUAL banca esta na tela. As secoes abaixo passam
            como `children` e continuam server components — a home tem trafego
            de pico, e conteudo estatico nao precisa ir para o bundle. */}
        <FunilHome bancas={destaques}>
          <DepoisDeEntrar />

          {/* ── O que é e o que não é (§1.2) ─────────────────────────────── */}
          <section className="mt-12 grid gap-px overflow-hidden rounded-surface border border-edge bg-edge sm:grid-cols-2">
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
          <section className="mt-12">
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
                número criava. */}
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

        {/* ── Rodapé honesto: mantenha, não suavize (§13) ──────────────── */}
        <footer className="mt-14 border-t border-rule pt-8 text-sm text-muted">
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
