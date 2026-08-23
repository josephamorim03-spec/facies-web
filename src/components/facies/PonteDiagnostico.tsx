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
 *   ❌ "a sua banca cobrou isso em 18 das últimas 1.244 questões" — a evidência
 *      por nó está quebrada em três pontos independentes: `topic_explanation.py`
 *      não tem nenhum importador de produção; `QuestionBankTopicOut` não declara
 *      `target_demand_evidence`, então o Pydantic descarta em silêncio; e
 *      `institution_key` nunca é gravado — o INSERT de
 *      `student_objectives_repo.py:171-182` não inclui a coluna, então
 *      `_apply_target_demand` retorna cedo sempre.
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
 *                               que É gravado — diferente de `institution_key`.
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
        <blockquote className="mt-4 max-w-[48ch] font-serif text-2xl/relaxed text-ink sm:text-3xl/relaxed">
          Você está de pós-plantão e tem cerca de 40 min. Nas duas últimas questões de
          pré-eclâmpsia você marcou rápido demais e errou — e o tema é cobrado pela sua
          prova-alvo. <strong className="font-semibold">Faça estas 12.</strong>
        </blockquote>
        <figcaption className="mt-4 max-w-[54ch] text-sm text-muted">
          Exemplo. Os minutos vêm do seu calendário, o pós-plantão é detectado, e “rápido
          demais” é medido contra o tamanho do enunciado — nenhuma das quatro partes é você
          quem digita.
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
