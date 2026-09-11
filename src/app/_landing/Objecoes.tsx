import { type DadosDaLanding } from "./dados";

/**
 * As quatro objeções reais, e nada além delas.
 *
 * O briefing nomeia quais são: é banco de questões, serve para outra prova,
 * preciso pagar, quanto tempo por dia. FAQ com pergunta que ninguém faria é
 * enchimento — e a primeira já é respondida pelo bloco anterior, então aqui ela
 * não volta.
 *
 * ⚠️ "Quem está por trás" NÃO repete o registro nem a conta. Na leitura de ponta
 * a ponta, "registro com data e código" aparecia em quatro lugares e esta era a
 * quarta — a repetição fazia o leitor achar que já tinha lido a página. Aqui a
 * resposta é sobre identidade, e o registro fica onde ele está: no bloco dos
 * trinta, que é onde o hash mora.
 */
export function Objecoes({ dados }: { dados: DadosDaLanding }) {
  const { prova, provasComFacies } = dados;

  const objecoes: { p: string; r: React.ReactNode }[] = [
    {
      p: `Serve para outra prova além do ${prova.sigla}?`,
      r: (
        <>
          Serve para as <span className="font-mono tabular-nums">{provasComFacies}</span> que já têm
          fácies medida. Cada uma diz na tela quantas questões a sustentam; quando são poucas,
          preferimos dizer que ainda não sabemos.
        </>
      ),
    },
    {
      p: "Preciso pagar para ver?",
      r: (
        // ⚠️ A resposta é "não, e não vai precisar" desde 07/09/2026, e o
        // motivo não é generosidade: a Fácies vende diagnóstico de coorte para
        // a instituição, e só consegue vender porque NÃO disputa o aluno dela
        // com um curso. Cobrar do aluno destruiria o argumento inteiro.
        // `conceder_trial` concede com `ends_at=None` — sem prazo.
        <>
          Não, e não vai precisar. A fácies e os trinta assuntos são gratuitos e não pedem
          cadastro. O cadastro, também de graça e sem cartão, abre o mapa e o plano{" "}
          <span className="text-ink">sem prazo</span>. Não vendemos assinatura para aluno: quem
          contrata a Fácies é a instituição de ensino.
        </>
      ),
    },
    {
      p: "Quanto tempo por dia?",
      r: (
        <>
          A revisão da última semana é de <span className="font-mono tabular-nums">3</span> a{" "}
          <span className="font-mono tabular-nums">5</span> questões por dia. Não há meta de horas,
          e não prometemos aprovação.
        </>
      ),
    },
    {
      p: "Quem está por trás?",
      r: (
        <>
          Um projeto pequeno e independente — não é braço de cursinho e não recebe de nenhum. Isso
          decide o que esta página é: sem aprovados para exibir e sem depoimento, o que sobra é
          medir e mostrar como.
        </>
      ),
    },
  ];

  return (
    <section className="border-t border-rule py-14 sm:py-24">
      <div className="mx-auto w-full max-w-[66ch] px-[var(--gutter)]">
        <h2 className="mb-4 max-w-[22ch] font-sans font-semibold">
          Perguntas que você faria
        </h2>
        <dl className="m-0 border-t border-rule">
          {objecoes.map(({ p, r }) => (
            <div key={p} className="border-b border-rule py-4">
              <dt className="mb-1 font-sans text-lg font-semibold">{p}</dt>
              <dd className="m-0 text-base text-muted">{r}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
