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
    <section className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Questoes extraidas</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">Candidatas do import selecionado.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <button
            onClick={onOpenCuradoria}
            className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-700 transition hover:bg-amber-100 dark:border-amber-700/50 dark:bg-amber-900/20 dark:text-amber-300"
          >
            Abrir curadoria
          </button>
          <label className="grid gap-1 text-sm font-medium text-gray-700 dark:text-gray-200">
            Status
            <select
              value={candidateStatus}
              onChange={(event) => onCandidateStatusChange(event.target.value)}
              className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-950"
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

      <div className="mt-4 overflow-auto rounded-lg border border-gray-200 dark:border-gray-800">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-gray-50 dark:bg-gray-950">
            <tr className="text-gray-500 dark:text-gray-400">
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
                <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
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
