"use client";

import Link from "next/link";

import { registrarEvento } from "@/lib/faciesFunnel";

/**
 * A ponte da leitura grátis para o produto pago — e o único ponto de conversão
 * da home.
 *
 * ## O conteúdo vem do posicionamento canônico
 *
 * `docs/product/positioning.md` pede duas coisas que esta seção não fazia:
 *
 * 1. **O antagonista é uma cena, nunca um concorrente.** A cena — 23h40,
 *    pós-plantão, cento e trinta mil questões, quarenta filtros, você fecha sem
 *    estudar — faz a comparação acontecer na cabeça do leitor sem acusar
 *    ninguém, o que importa vindo de quem ainda não tem marca.
 * 2. **"Mostra uma recomendação real com o porquê, não uma lista de features."**
 *    O doc chama esse artefato de *peça principal*: "isso não se copia com
 *    slogan e dispensa explicação".
 *
 * ## ⚠️ Cada cláusula do artefato foi verificada como ALCANÇÁVEL, não só como existente
 *
 * Duas versões anteriores desta seção afirmaram coisas cujo código existia mas
 * cujo caminho **não executa em produção**. O erro é sutil e caro: achar a
 * constante e concluir que a frase é verdadeira.
 *
 *   ❌ "Três baterias de 100 questões" — `diagnostic_blueprint.py` tem
 *      `DIAGNOSTIC_BATTERY_SIZE = 3` e `DIAGNOSTIC_SESSION_SIZE = 100`, mas o
 *      único consumidor é `study_plan/plan_service.py`, atrás de
 *      `ENABLE_ADAPTIVE_STUDY_PLAN_V1`, que `factory.py:56` lê com default
 *      `"false"`. O `/banco` nunca cria `session_kind="kros"`.
 *
 *   ⚠️ "a sua banca cobrou isso em 18 das últimas 1.244 questões" — **a cadeia
 *      foi consertada em 2026-08-24**, e mesmo assim a frase continua FORA desta
 *      página. Eram cinco quebras, não três: o INSERT de
 *      `student_objectives_repo` omitia `institution_key`; `browse_topics` nunca
 *      chamava `_apply_target_demand`; `QuestionBankTopicOut` não declarava
 *      `target_demand_evidence` (o Pydantic descarta calado); a consulta de
 *      demanda não trazia `institution_label` nem `recent_question_count`; e
 *      `topic_explanation.py` não tinha importador. Somava-se uma sexta, do lado
 *      do kbank: o seletor de prova alvo lia `board_stats_v`, que tem 0 linhas,
 *      enquanto `krosmed_question_bank_institutions_v` (migration 104) esperava
 *      sem nenhum consumidor.
 *
 *      **Por que não voltar a afirmar aqui.** A cadeia está provada em teste de
 *      integração ponta a ponta (`tests/test_personalizacao_por_prova_alvo.py`),
 *      com banco de questões FALSO. Ninguém ainda observou a evidência sair no
 *      JSON de produção, e esta página é anúncio — CDC art. 30. A ordem é: um
 *      aluno real declara a prova, a evidência aparece em `/banco`, e SÓ ENTÃO a
 *      frase volta para cá. Foi presumir o contrário que pôs as duas afirmações
 *      erradas nesta página nas duas versões anteriores.
 *
 * O que sobrou é o que roda, sem flag, hoje:
 *
 *   "de pós-plantão"          → `navigation_service._interruption_risk`, inferido
 *                               do calendário e nunca perguntado
 *   "cerca de 40 min"         → `_predicted_capacity` via `StudyCapacityService`
 *   "marcou rápido demais"    → `question_bank_cognitive.impulsive_haste`, com
 *                               limiar CALCULADO da contagem de palavras do
 *                               enunciado (`haste_threshold_ms`), não arbitrado
 *   "cobrada pela sua prova"  → `_target_relevance` (peso 0,15 no score final) e
 *                               o rótulo "cobrada pela sua prova alvo" que o
 *                               ranking já devolve ao aluno. Usa `board_code`,
 *                               que É gravado. (`institution_key` passou a ser
 *                               gravado também, mas é o de cima que vale aqui.)
 *
 * ⚠️ O exemplo é marcado como exemplo. Um artefato assim, sem rótulo, é
 * indistinguível de um print de conta real, e o §17 trata anúncio como
 * obrigação contratual (CDC art. 30 e 37).
 */
export function PonteDiagnostico({ banca }: { banca: string | null }) {
  return (
    <section className="mt-12" aria-labelledby="ponte-titulo">
      {/* A cena. Curta de propósito: quem viveu se reconhece na primeira linha,
          e alongar vira lamento. */}
      <p className="max-w-[44ch] font-serif text-2xl/snug font-semibold text-ink sm:text-3xl/snug">
        23h40, pós-plantão. Você abre a plataforma, vê cento e trinta mil questões e
        quarenta filtros, e fecha sem estudar.
      </p>
      <h2 id="ponte-titulo" className="mt-6 max-w-[42ch] text-lg text-muted">
        O problema nunca foi falta de questão. Foi ter de decidir, cansado, qual delas.
      </h2>

      {/* O artefato — a "peça principal" do §"O anúncio é o artefato". */}
      {/* Este bloco tem PERMISSAO de ser o maior da pagina, e e o unico.
          Ele tinha exatamente o mesmo peso dos outros seis cartoes — mesma
          superficie, mesma borda, mesmo respiro — e por isso a pagina inteira
          lia como documento: sete blocos de peso identico nao tem climax. O
          fundo mais escuro o separa dos `bg-surface`, e a penumbra e a unica
          da pagina. */}
      <figure className="paper-overlay mt-8 rounded-surface border border-edge border-l-2 border-l-primary bg-surfaceMuted p-6 sm:p-10">
        <span className="paper-eyebrow">A Fácies abre assim</span>
        {/* ⚠️ DUAS COISAS SAÍRAM DESTE ARTEFATO, e as duas por bons motivos.
            Quem for repor, leia antes.

            1. OS MINUTOS. Dizia "você está de pós-plantão e tem cerca de 40
               min", três linhas abaixo de uma cena que começa em "23h40". O
               leitor faz a conta errada na hora — 23h40 mais 40 minutos — e
               para de ler o argumento para resolver a aritmética. Os 40 min
               eram o tempo DELE, não um horário, e nada na frase dizia isso.

               Some também porque prever minutos com precisão é promessa cara: o
               `_predicted_capacity` estima, e estimativa exibida como número
               seco vira compromisso que a primeira semana desmente.
               "Pós-plantão" fica: ele é DETECTADO no calendário, não previsto.

            2. A ACUSAÇÃO. Dizia que a resposta saiu antes de a leitura fechar —
               isto é, uma afirmação sobre COMO a pessoa leu, feita logo depois
               do erro dela. Mesmo na voz de treinador continua sendo o sistema
               dizendo ao aluno o que ele fez de errado consigo mesmo, e isso
               gera ansiedade e raiva, não estudo.

               O que sobra é FATO sem julgamento: o assunto caiu, você errou, a
               sua prova cobra muito isso. Nenhuma das três partes é opinião
               sobre a pessoa. */}
        <blockquote className="mt-4 max-w-[48ch] font-serif text-2xl/relaxed text-ink sm:text-3xl/relaxed">
          Você está de pós-plantão. Pré-eclâmpsia caiu nas suas duas últimas sessões e você
          errou as duas — e é dos assuntos que a sua prova-alvo mais cobra.{" "}
          <strong className="font-semibold">Comece por estas 12.</strong>
        </blockquote>
        <figcaption className="mt-4 max-w-[54ch] text-sm text-muted">
          Exemplo. O pós-plantão é detectado no seu calendário e o peso do assunto vem da sua
          prova-alvo — nenhuma das duas partes é você quem digita.
        </figcaption>
      </figure>

      {/* O GATE DE E-MAIL SAIU DAQUI, e foi para o fim da página.

          Ele morava neste ponto com a justificativa de ocupar o instante de
          maior interesse. A justificativa estava certa e o lugar estava errado:
          logo ABAIXO desta seção vêm as três telas do produto e a captura do
          `/hoje` — que é a prova mais persuasiva da página inteira. Pedir o
          e-mail aqui gastava o pico antes de mostrar o que se está comprando, e
          quem dissesse não já tinha dito não quando a prova chegava.

          Agora a ordem é: cena → artefato → produto → é/não é → acesso → gate.
          O gate encosta no parágrafo que diz que a assinatura ainda não abriu, e
          vira a resposta natural dele ("saber quando a Fácies abrir"), em vez de
          uma interrupção no meio do argumento.

          O login continua link discreto: não existe caminho self-serve, e quem
          clicava em "Começar pela sua prova" criava conta com o Google e caía em
          "Ativar Acesso: chave recebida do seu mentor" — atrito máximo, valor
          zero, numa primeira impressão cujo ativo é credibilidade. Quando a
          assinatura abrir, a hierarquia se inverte de volta. */}
      <p className="mt-8 text-sm text-muted">
        Já tem chave de acesso?{" "}
        <Link
          href="/login"
          onClick={() => registrarEvento("diagnostico_clicado", banca)}
          className="text-primary underline underline-offset-4"
        >
          Entrar
        </Link>
      </p>
    </section>
  );
}
