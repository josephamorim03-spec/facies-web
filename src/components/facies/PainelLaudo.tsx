/**
 * A casca do laudo — a mesma para a prova nacional e para a banca institucional.
 *
 * ## Por que ela existe
 *
 * `ProvaReport` e `FaciesReport` carregavam cópias IDÊNTICAS de `Rotulo` e
 * `Painel`, mais dois cabeçalhos com a mesma forma. A divergência já tinha
 * começado e era invisível: um usava `<h2>` para o título do painel e o outro
 * `<h3>`, então a mesma peça de informação tinha dois níveis de heading conforme
 * a rota — e a escala tipográfica da folha (`.paper-page h2` / `h3`) desenhava as
 * duas em tamanhos diferentes.
 *
 * Com as duas famílias servidas pela MESMA rota (`/prova/[slug]`), duas cascas
 * separadas garantiam que a próxima mudança de layout chegasse só numa delas.
 *
 * ## `<h2>` nos dois, e não `<h3>`
 *
 * O título da página é o `<h1>`; cada painel é uma seção dele. `<h3>` sem `<h2>`
 * acima é um pulo de nível — o leitor de tela anuncia uma subseção de algo que
 * não existe, e o índice de cabeçalhos da página nasce torto.
 */

export function RotuloLaudo({ children }: { children: React.ReactNode }) {
  return <span className="paper-eyebrow">{children}</span>;
}

export function PainelLaudo({
  numero,
  titulo,
  nota,
  children,
}: {
  numero: string;
  titulo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule py-6">
      <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <RotuloLaudo>{numero}</RotuloLaudo>
        <h2 className="font-serif text-xl/snug font-semibold text-ink lg:text-2xl/snug">
          {titulo}
        </h2>
        {nota ? <span className="text-sm text-muted lg:text-base">{nota}</span> : null}
      </div>
      {children}
    </section>
  );
}

export type CampoDoLaudo = {
  rotulo: string;
  valor: string;
  /**
   * Mono é para DADO — contagem, janela, percentual. O nome da prova é prosa e
   * fica na sans; era a única diferença real entre os dois cabeçalhos antigos,
   * e agora é uma decisão por campo em vez de por componente.
   */
  mono?: boolean;
};

/**
 * A fileira que abre todo laudo: de quem é a leitura, de que janela, e sobre
 * que base. Nenhum número desta página aparece sem o seu denominador, e é aqui
 * que o denominador é declarado uma vez para o painel inteiro.
 */
export function CabecalhoLaudo({
  campos,
  selo,
}: {
  campos: CampoDoLaudo[];
  /** O distintivo à direita — hoje só "base composta", da prova nacional. */
  selo?: string;
}) {
  return (
    <header className="flex flex-wrap gap-x-8 gap-y-3 border-b border-rule px-5 py-4 sm:px-6">
      {campos.map((campo) => (
        <div key={campo.rotulo} className="flex flex-col gap-0.5">
          <RotuloLaudo>{campo.rotulo}</RotuloLaudo>
          <b
            className={
              campo.mono
                ? "font-mono text-sm text-ink"
                : "text-sm font-medium text-ink lg:text-base"
            }
          >
            {campo.valor}
          </b>
        </div>
      ))}
      {selo ? (
        <span className="paper-eyebrow self-center rounded-control border border-accent px-2 py-1 text-accent">
          {selo}
        </span>
      ) : null}
    </header>
  );
}
