import type { Banca } from "@/lib/facies";
import { desvioNacional, janela, NACIONAL, PISO_N_CELULA } from "@/lib/facies";

/**
 * A Fácies da prova, em três painéis.
 *
 * A ORDEM é resultado de medição, não de gosto. `measure_raio_x_readiness.py`
 * mediu a sobreposição do top-15 entre pares de bancas (Jaccard):
 *
 *     especialidade ... 1,00  -> todas as bancas têm o MESMO top-7
 *     tema ............ 0,67
 *     subtema ......... 0,20  -> aqui mora a fácies
 *
 * E o formato do item discrimina mais forte que qualquer um deles, com exatidão
 * total e custo zero: SES DF é 93% certo/errado contra 5% nacional. Por isso o
 * perfil estrutural vem primeiro e a distribuição por área vem por último.
 *
 * Liderar com a área — que é o que o protótipo fazia — provaria o contrário do
 * que a página afirma: mostraria a mesma tela para todas as bancas.
 */

function Rotulo({ children }: { children: React.ReactNode }) {
  return (
    <span className="paper-eyebrow">
      {children}
    </span>
  );
}

function Painel({
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
        <Rotulo>{numero}</Rotulo>
        <h3 className="font-serif text-xl font-semibold text-ink">{titulo}</h3>
        {nota ? <span className="text-sm text-muted">{nota}</span> : null}
      </div>
      {children}
    </section>
  );
}

/** Barra proporcional. Sem imagem e sem caractere: largura é o dado. */
function Barra({ pct }: { pct: number }) {
  return (
    <span
      className="block h-2 w-full overflow-hidden rounded-control border border-rule bg-paper"
      aria-hidden="true"
    >
      <span
        className="block h-full bg-primary"
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
      />
    </span>
  );
}

export function FaciesReport({ banca }: { banca: Banca }) {
  const naoDireta = banca.formato.distribuicao.filter((linha) => linha.codigo !== "direta");

  return (
    <div className="rounded-surface border border-edge bg-surface">
      {/* Cabeçalho de laudo: toda leitura declara a base de onde saiu. */}
      <header className="flex flex-wrap gap-x-8 gap-y-3 border-b border-rule px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-0.5">
          <Rotulo>Banca</Rotulo>
          <b className="text-sm font-semibold text-ink">{banca.nome}</b>
        </div>
        <div className="flex flex-col gap-0.5">
          <Rotulo>Janela</Rotulo>
          <b className="font-mono text-sm text-ink">{janela(banca)}</b>
        </div>
        <div className="flex flex-col gap-0.5">
          <Rotulo>Base</Rotulo>
          <b className="font-mono text-sm text-ink">
            {banca.total.toLocaleString("pt-BR")} questões
          </b>
        </div>
        {banca.uf ? (
          <div className="flex flex-col gap-0.5">
            <Rotulo>UF</Rotulo>
            <b className="font-mono text-sm text-ink">{banca.uf}</b>
          </div>
        ) : null}
      </header>

      <div className="px-5 sm:px-6">
        {/* ── PAINEL 1 — o que mais discrimina, e é exato ───────────────── */}
        <Painel
          numero="01"
          titulo="Como as questões são feitas"
          nota="exato · sem estimativa"
        >
          {naoDireta.length > 0 ? (
            <ul className="mb-5 grid gap-3">
              {naoDireta.map((linha) => {
                const desvio = desvioNacional(linha.codigo, linha.pct);
                const relevante = Math.abs(desvio) >= 3;
                return (
                  <li
                    key={linha.codigo}
                    className="grid grid-cols-[minmax(8rem,11rem)_1fr_auto] items-center gap-3"
                  >
                    <span className="text-sm text-ink">{linha.rotulo}</span>
                    <Barra pct={linha.pct} />
                    <span className="font-mono text-xs tabular-nums text-muted">
                      {linha.pct.toFixed(0)}%{" "}
                      <span className={relevante ? "text-accent" : ""}>
                        {desvio > 0 ? "+" : ""}
                        {desvio.toFixed(0)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mb-5 text-sm text-muted">
              Todas as questões desta banca são de múltipla escolha direta.
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {banca.formato.alternativas.map((alt) => (
              <span
                key={alt.n}
                className="rounded-control border border-rule px-3 py-1.5 text-sm text-ink"
              >
                <b className="font-mono">{alt.pct.toFixed(0)}%</b> com{" "}
                {alt.n === 2 ? "certo/errado" : `${alt.n} alternativas`}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            O número ao lado da barra é a diferença para a média nacional
            ({NACIONAL.total.toLocaleString("pt-BR")} questões).
          </p>
        </Painel>

        {/* ── PAINEL 2 — a fácies propriamente dita ─────────────────────── */}
        <Painel
          numero="02"
          titulo="O que mais cai"
          nota={`${banca.mais_cai.base.toLocaleString("pt-BR")} questões classificadas · ${banca.mais_cai.cobertura.toFixed(0)}% da base`}
        >
          {banca.mais_cai.linhas.length > 0 ? (
            <ol className="grid gap-0">
              {banca.mais_cai.linhas.map((linha, indice) => (
                <li
                  key={linha.rotulo}
                  className="flex items-baseline gap-3 border-b border-rule py-2 last:border-b-0"
                >
                  <span className="w-6 shrink-0 font-mono text-xs text-muted">
                    {String(indice + 1).padStart(2, "0")}
                  </span>
                  <span className="flex-1 text-sm text-ink">{linha.rotulo}</span>
                  {/* Sem `n`, sem número. É a invariante do §14.2.3. */}
                  {linha.exibivel ? (
                    <span className="font-mono text-sm tabular-nums text-ink">{linha.n}</span>
                  ) : (
                    <span className="text-xs text-muted">
                      menos de {PISO_N_CELULA}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">
              Base insuficiente para listar assuntos nesta banca.
            </p>
          )}
          {banca.mais_cai.cobertura < 60 ? (
            <p className="mt-3 text-xs text-muted">
              A classificação por assunto cobre {banca.mais_cai.cobertura.toFixed(0)}% desta
              banca. A lista descreve essa parte, não a prova inteira.
            </p>
          ) : null}
        </Painel>

        {/* ── PAINEL 3 — contexto. Não discrimina (Jaccard 1,00). ───────── */}
        <Painel
          numero="03"
          titulo="Distribuição por área"
          nota="contexto · quase igual em todas as bancas"
        >
          <ul className="grid gap-2">
            {banca.areas.linhas.map((linha) => (
              <li
                key={linha.rotulo}
                className="grid grid-cols-[minmax(8rem,13rem)_1fr_auto] items-center gap-3"
              >
                <span className="text-sm text-ink">{linha.rotulo}</span>
                <Barra pct={linha.pct} />
                <span className="font-mono text-xs tabular-nums text-muted">
                  {linha.pct.toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </Painel>

        {/* ── Leitura: derivada dos números, nunca escrita à mão ────────── */}
        {banca.leitura.length > 0 ? (
          <Painel numero="04" titulo="Leitura">
            <ul className="grid gap-3">
              {banca.leitura.map((frase) => (
                <li
                  key={frase}
                  className="paper-reading border-l-2 border-primary pl-4 text-base leading-relaxed text-ink"
                  dangerouslySetInnerHTML={{ __html: negrito(frase) }}
                />
              ))}
            </ul>
          </Painel>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Converte o `**negrito**` da leitura gerada.
 *
 * `dangerouslySetInnerHTML` aqui é seguro e a razão precisa ficar escrita: a
 * string NÃO vem do usuário nem do banco em tempo de requisição — ela é montada
 * por `build_facies_dataset.py` a partir de números, com o texto fixo no código
 * do gerador. O único conteúdo variável são dígitos e nomes de formato de um
 * vocabulário fechado. Ainda assim, escapo tudo antes e só depois reintroduzo o
 * `<strong>`, para que uma mudança futura no gerador não vire injeção.
 */
function negrito(texto: string): string {
  const escapado = texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return escapado.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
