import type { EvidenciaSubtema } from "@/lib/revisao";
import { classeModal, rotuloDaClasse } from "@/lib/revisao";

/**
 * A medida de como a banca cobra o assunto — a única coisa nesta página que foi
 * CONTADA e não escrita.
 *
 * ## Por que isto não é um gráfico
 *
 * O dado é uma proporção só, por assunto, impressa em papel. Gráfico aqui seria
 * enfeite: não há série para comparar, não há eixo do tempo, e não existe hover
 * numa folha. A forma certa para "um número que é a manchete" é o número grande
 * com uma barra de apoio — e é o que está aqui.
 *
 * ## O `n` anda junto do `%`, e isso é regra
 *
 * "62% pedem próxima conduta" sem o `n` faz o leitor supor centenas de questões.
 * A base tem entre 16 e 24 por assunto, porque o recorte é só a prova real —
 * o que é uma virtude do produto, não um defeito a esconder. Publicar a fração
 * sem a contagem transformaria um recorte honesto numa estatística inflada, que
 * é exatamente o que a página promete não fazer.
 *
 * ## Quando o classificador não sabe, isto aparece
 *
 * `abstencao` é a fração de questões em que a heurística não achou comando
 * reconhecível. Acima de metade, a barra ganha a nota de sinal fraco: uma
 * amostra pode ser grande e mesmo assim não sustentar a frase.
 */
export function MedidaDaCobranca({ evidencia }: { evidencia: EvidenciaSubtema | null }) {
  if (!evidencia || evidencia.n_questoes === 0) return null;

  const modal = classeModal(evidencia, "charge_pattern");
  const raciocinio = classeModal(evidencia, "reasoning_type");
  const abstencao = evidencia.abstencao?.charge_pattern ?? 0;
  const sinalFraco = abstencao > 0.5 || !evidencia.sustenta_afirmacao;

  return (
    <figure className="mt-5 border-t border-rule pt-4 print:break-inside-avoid">
      <figcaption className="paper-eyebrow">o que medimos na base real</figcaption>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        <span className="text-sm text-muted">
          <span className="font-mono text-2xl font-semibold text-ink">
            {evidencia.n_questoes}
          </span>{" "}
          questões da prova neste assunto
          {evidencia.anos.min !== null ? (
            <>
              , de {evidencia.anos.min} a {evidencia.anos.max}
            </>
          ) : null}
        </span>
        {raciocinio ? (
          <span className="text-sm text-muted">
            raciocínio dominante:{" "}
            <span className="text-ink">{rotuloDaClasse(raciocinio.classe)}</span>
          </span>
        ) : null}
      </div>

      {modal ? (
        <div className="mt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <span className="text-base text-ink">
              pede <span className="font-medium">{rotuloDaClasse(modal.classe)}</span>
            </span>
            <span className="font-mono text-sm text-muted">
              {modal.n} de {evidencia.n_questoes}
            </span>
          </div>
          {/* Trilho + preenchimento numa cor só: é magnitude, não identidade.
              O canto arredondado fica na ponta do dado, ancorado na base. */}
          <div
            className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surfaceMuted"
            role="img"
            aria-label={`${Math.round(modal.fracao * 100)}% das questões pedem ${rotuloDaClasse(modal.classe)}`}
          >
            <div
              className="h-full rounded-full bg-primary print:bg-ink"
              style={{ width: `${Math.max(2, Math.round(modal.fracao * 100))}%` }}
            />
          </div>
        </div>
      ) : null}

      {sinalFraco ? (
        <p className="mt-3 max-w-[60ch] text-xs text-muted">
          Sinal fraco: em {Math.round(abstencao * 100)}% das questões o
          classificador não reconheceu um comando claro. A contagem orienta a
          leitura; ela não fecha um padrão.
        </p>
      ) : null}
    </figure>
  );
}
