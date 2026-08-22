import {
  type QuestionBankAdminCandidate,
} from "@/lib/api/domains/question-bank-admin";

import { CandidateRow } from "./AdminShared";

type Props = {
  candidates: QuestionBankAdminCandidate[];
  candidateStatus: string;
  onCandidateStatusChange: (value: string) => void;
  onOpenCuradoria: () => void;
};

export default function CandidatesPanel({
  candidates,
  candidateStatus,
  onCandidateStatusChange,
  onOpenCuradoria,
}: Props) {
  return (
    <section className="rounded-surface border border-edge bg-surface p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-ink">Questões extraídas</h2>
          <p className="mt-1 text-sm text-ink">Candidatas do import selecionado.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <button
            onClick={onOpenCuradoria}
            className="border border-warning bg-surfaceMuted px-4 py-2 text-sm font-semibold text-warning transition hover:bg-surfaceMuted/50/20"
          >
            Abrir curadoria
          </button>
          <label className="grid gap-1 text-sm font-medium text-ink">
            Status
            <select
              value={candidateStatus}
              onChange={(event) => onCandidateStatusChange(event.target.value)}
              className="rounded-control border border-edge bg-surface px-3 py-2 text-sm"
            >
              <option value="">Todos</option>
              <option value="dedup_pending">dedup_pending</option>
              <option value="canonical_created">canonical_created</option>
              <option value="linked">linked</option>
              <option value="duplicate_found">duplicate_found</option>
              <option value="needs_review">needs_review</option>
              <option value="discarded">discarded</option>
              <option value="quarantine_technical">quarantine_technical</option>
            </select>
          </label>
        </div>
      </div>

      <div className="mt-4 overflow-auto border border-edge">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-surface">
            <tr className="text-muted">
              <th className="px-3 py-3 font-semibold">N</th>
              <th className="px-3 py-3 font-semibold">Pag.</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Ano</th>
              <th className="px-3 py-3 font-semibold">Instituicao</th>
              <th className="px-3 py-3 font-semibold">Enunciado</th>
              <th className="px-3 py-3 font-semibold">Grade</th>
              <th className="px-3 py-3 text-right font-semibold">Conf.</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((item) => (
              <CandidateRow key={item.id} item={item} />
            ))}
            {candidates.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-muted">
                  Nenhum candidato.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
