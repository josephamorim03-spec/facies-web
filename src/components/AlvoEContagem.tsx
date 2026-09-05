import { type AlvoDaTela, textoDaContagem } from "@/components/alvoDaTela";

/**
 * A prova-alvo e quantos dias faltam — o `UNIFESP · 63 dias` do projeto de
 * design.
 *
 * Aparece nos artboards 8b (Hoje), 9b (Evolução), 9c (Plano) e 13e (dia
 * começado). É elemento recorrente, não barra fixa: cada tela o coloca onde o
 * desenho o põe, e por isso é um componente e não parte do `AppShell`.
 *
 * ## ⚠️ A ESCOLHA DA FONTE NÃO MORA AQUI, e é de propósito
 *
 * Este componente lia direto o `StudentObjectiveV2` e escolhia sozinho a
 * origem. A origem era uma só — `/objectives/v2/mine`, atrás de
 * `ENABLE_STUDENT_OBJECTIVES_V2`, que o `.env.example` declara `false`. Com a
 * flag desligada a rota responde **404** e esta linha ficava em branco para
 * todo aluno, inclusive para quem tinha acabado de declarar a prova.
 *
 * A decisão (qual dos dois contratos vence, qual nome sai, qual frase de prazo
 * o estado da data autoriza) foi para `alvoDaTela.ts`, que é `.ts` e portanto
 * **testável**: JSX não passa pelo `--experimental-strip-types`, então lógica
 * dentro de um `.tsx` é lógica que o runner de unidade deste repositório não
 * alcança. Era exatamente esse o defeito — escolha de fonte errada, invisível
 * para typecheck e para lint.
 *
 * O que sobra aqui é desenho: um `<p>`, o nome em `text-ink`, o número em
 * `font-mono`, e a ressalva "data prevista" quando a data não é edital.
 */
export function AlvoEContagem({
  alvo,
  className = "",
}: {
  alvo: AlvoDaTela | null | undefined;
  className?: string;
}) {
  if (!alvo) return null;
  const contagem = textoDaContagem(alvo);

  return (
    <p className={`paper-eyebrow ${className}`.trim()} title={alvo.explicacao || undefined}>
      <span className="text-ink">{alvo.nome}</span>
      {contagem ? (
        <>
          {" · "}
          <span className="font-mono text-ink">{contagem}</span>
          {alvo.prevista ? ", data prevista" : ""}
        </>
      ) : null}
    </p>
  );
}
