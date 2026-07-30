"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import {
  StudentDeepLinks,
  StudentDetailsDisclosure,
  StudentPrimaryAction,
  StudentSurfaceInsight,
  StudentSurfaceSnapshot,
} from "@/components/student/StudentActionSurface";
import { DataFreshness, StudentPage, StudentPageHeader } from "@/components/student/StudentExperienceUI";
import { getStudentTrack, type StudentSurfaceHome } from "@/lib/api";
import { getAuthToken } from "@/lib/auth";

const FALLBACK_LINKS = [
  {
    label: "Relatorio",
    href: "/dados-e-relatorios/relatorio",
    reason: "Leitura narrativa do progresso e dos limites dos dados.",
  },
  {
    label: "Graficos",
    href: "/dados-e-relatorios/graficos",
    reason: "Series de acerto, volume, areas e revisoes.",
  },
  {
    label: "Historico",
    href: "/revisoes",
    reason: "Sessoes e provas registradas para auditoria.",
  },
];

export default function DadosERelatoriosPage() {
  const [trackHome, setTrackHome] = useState<StudentSurfaceHome | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getStudentTrack(getAuthToken())
      .then((home) => {
        if (active) setTrackHome(home);
      })
      .catch(() => {
        if (active) setTrackHome(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <StudentPage>
      <StudentPageHeader
        eyebrow="Dados"
        title="Investigue sem se perder"
        description="Relatorios e graficos ficam aqui para consulta. A proxima acao continua em Acompanhar."
        actions={
          trackHome ? (
            <DataFreshness
              status={trackHome.status}
              generatedAt={trackHome.generated_at}
              missingSources={trackHome.missing_sources}
            />
          ) : undefined
        }
      />

      {loading ? (
        <div className="rounded-lg border border-edge bg-surface p-4 text-sm text-muted">
          Carregando retrato dos dados...
        </div>
      ) : trackHome ? (
        <>
          <StudentSurfaceInsight surface={trackHome} />
          <StudentPrimaryAction action={trackHome.primary_action} eyebrow="Conclusao" />
          <StudentDeepLinks links={trackHome.deep_links} />
          <StudentDetailsDisclosure
            title="Qualidade e escopo dos dados"
            status={trackHome.status}
            missingSources={trackHome.missing_sources}
          >
            <StudentSurfaceSnapshot
              items={[
                { label: "Qualidade", value: trackHome.data_quality },
                { label: "Questões na semana", value: String(trackHome.details.questions_done_week ?? "-") },
                { label: "Precisão", value: trackHome.details.accuracy_pct === null || trackHome.details.accuracy_pct === undefined ? "-" : `${Math.round(Number(trackHome.details.accuracy_pct))}%` },
              ]}
            />
          </StudentDetailsDisclosure>
        </>
      ) : (
        <section className="space-y-4 rounded-lg border border-edge bg-paper p-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              O que os dados dizem agora
            </p>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-ink">
              Ainda nao consegui montar o retrato
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Os caminhos de investigacao continuam disponiveis, mas a leitura principal depende do agregador.
            </p>
          </div>
          <nav className="grid gap-2 sm:grid-cols-3" aria-label="Aprofundamentos">
            {FALLBACK_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="rounded-lg border border-edge bg-surface px-4 py-3 hover:border-ink">
                <p className="text-sm font-semibold text-ink">{link.label}</p>
                <p className="mt-1 text-xs leading-5 text-muted">{link.reason}</p>
              </Link>
            ))}
          </nav>
        </section>
      )}
    </StudentPage>
  );
}
