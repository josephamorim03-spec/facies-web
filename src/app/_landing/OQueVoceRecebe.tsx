/**
 * O que você recebe — os três níveis, sem letra miúda.
 *
 * ## O aluno não paga. Nunca. E isso é estratégia, não promoção.
 *
 * Decisão de 07/09/2026. A Fácies vende diagnóstico de coorte para a
 * INSTITUIÇÃO, e só consegue vender porque não disputa o aluno dela com um
 * curso — que é exatamente o conflito que Estratégia MED, Medway e MedCof não
 * conseguem tirar, e que a Afya carrega em dobro por ser dona de 33 escolas de
 * medicina. Cobrar do aluno destruiria o único fosso real do produto.
 *
 * Por isso os dois primeiros níveis são gratuitos SEM PRAZO e o terceiro deixou
 * de ser "assinatura em breve": ele é a instituição.
 *
 * ⚠️ Sobre o CDC: a home prometia R$ 490 no primeiro ano a quem se cadastrasse
 * antes da abertura. Acesso gratuito permanente entrega MAIS do que o
 * prometido, então não há oferta descumprida — o art. 30 obriga a honrar o
 * anunciado, não proíbe dar melhor.
 *
 * ⚠️ O laço com o backend não sumiu, mudou de objeto: era `DIAS_DE_TRIAL`,
 * agora é a AUSÊNCIA de prazo. `verificar-landing-v8.mjs` reprova se o backend
 * voltar a conceder com data e esta página continuar dizendo "sem prazo".
 */

function garantias(): string[] {
  return [
    "A leitura da sua prova é gratuita, para sempre e sem cadastro.",
    "O cadastro grátis não pede cartão e não tem prazo.",
    "Não vendemos conteúdo teórico — o que medimos serve para decidir onde aplicar o material que você já tem.",
    "Não prometemos aprovação.",
    "Não cobramos do aluno. Quem contrata a Fácies é a instituição de ensino.",
  ];
}

export function OQueVoceRecebe() {
  return (
    <section id="o-que-voce-recebe" className="border-t border-rule bg-paper py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[1080px] px-[var(--gutter)]">
        <div className="max-w-[66ch]">
          <span className="paper-eyebrow">o que você recebe</span>
          <h2 className="mt-3 mb-4 max-w-[26ch] font-sans font-semibold">
            Três níveis. Nenhum deles cobra do aluno.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="flex flex-col rounded-surface border border-rule bg-surface p-5 sm:p-6">
            <h3 className="paper-eyebrow">grátis · para sempre</h3>
            <p className="mt-3 grow text-base">
              A leitura completa da sua prova — a fácies, as nove medidas, os assuntos mais
              prováveis, o ebook da revisão final e a nossa conta publicada depois da prova.
            </p>
            <p className="mt-3 text-sm text-muted">sem cadastro · sem cartão</p>
          </div>

          <div className="flex flex-col rounded-surface border border-rule bg-surface p-5 sm:p-6">
            <h3 className="paper-eyebrow">cadastro grátis · sem prazo</h3>
            <p className="mt-3 grow text-base">
              O mapa da prova e o plano de estudo, <span className="text-ink">sem prazo</span> e sem
              cartão. A conta nasce com acesso e ele não vence.
            </p>
            <p className="mt-3 text-sm text-muted">nenhuma cobrança, nunca</p>
          </div>

          <div className="flex flex-col rounded-surface border border-rule bg-surface p-5 sm:p-6">
            <h3 className="paper-eyebrow">instituições · sob contrato</h3>
            <p className="mt-3 grow text-base">
              O diagnóstico da coorte contra a matriz do ENAMED, para a coordenação de curso: onde a
              turma está, o que custa mais caro e o que mudou entre as medições.
            </p>
            <p className="mt-3 text-sm text-muted">é daqui que vem a receita</p>
          </div>
        </div>

        <ul className="mt-8 space-y-2 border-t border-rule pt-6 text-sm text-muted">
          {garantias().map((linha) => (
            <li key={linha}>{linha}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
