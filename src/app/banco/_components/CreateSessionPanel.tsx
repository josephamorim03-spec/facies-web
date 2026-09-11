"use client";

import type { ReactNode } from "react";

import { LoadBar } from "@/components/ui/LoadBar";
import type { QuestionBankAvailability, StudyKind } from "@/lib/api";
import { CORRECTION_MODE_LABEL, type CorrectionMode } from "../_lib/sessionBuilder";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { BOTTOM_ACTION_BAR_RESERVE_CLASS, BottomActionBar } from "@/components/ui/BottomActionBar";

/**
 * O recuo que a página hospedeira tem de aplicar ao seu contentor de scroll.
 *
 * ⚠️ Reexportado DAQUI de propósito, e não importado do primitivo pela página.
 * Quem monta a barra é este painel; a reserva é consequência dessa decisão, e
 * não uma escolha da página. Com o import direto, mover a barra para outro
 * componente deixaria a página a reservar espaço para uma barra que já não
 * existe — e ninguém teria por que reparar.
 */
export const RESERVA_DA_BARRA = BOTTOM_ACTION_BAR_RESERVE_CLASS;

function availabilityText(availability: QuestionBankAvailability | null): string {
  if (!availability) return "Calculando";
  if (availability.answer_status === "answered") return `${availability.answered_count} já realizadas`;
  if (availability.answer_status === "wrong") return `${availability.available_count} erros disponíveis`;
  if (availability.answer_status === "correct") return `${availability.available_count} acertos disponíveis`;
  if (availability.answer_status === "all") return `${availability.total_count} questões encontradas`;
  return `${availability.available_count} questões disponíveis`;
}

function IconClipboard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M9 3h6l1 2h3v16H5V5h3l1-2Z" />
      <path d="M9 9h6" />
      <path d="M9 13h6" />
      <path d="M9 17h4" />
    </svg>
  );
}

function IconClock({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      {/* Mostrador QUADRADO. O circulo era o mesmo do lucide, e num icone de
          24px ele e a unica curva suave da barra inteira. */}
      <rect x="3" y="3" width="18" height="18" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconChart({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className={className} aria-hidden="true">
      <path d="M5 19V9" />
      <path d="M12 19V5" />
      <path d="M19 19v-7" />
      <path d="M3 19h18" />
    </svg>
  );
}

function SummaryRow({
  icon,
  label,
  value,
  detail,
  stale = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
  /** Recalculando: o valor exibido nao vale mais. */
  stale?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-edge py-3 last:border-b-0">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-surfaceMuted text-muted">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted">{label}</p>
        {stale ? (
          // Reticula no lugar do numero, e nao o numero esmaecido: valor velho
          // continua legivel, e legivel e' o que faz o aluno acreditar nele.
          <div className="paper-skeleton mt-1 h-5 w-24" aria-label="Recalculando" />
        ) : (
          // Mono, e nao sans negrito: "24", "48 min", "30 no filtro" sao
          // DADO, e a mono e a textura de dado deste sistema. Medido, o
          // Banco era a tela com MENOS mono do app (16%), contra os 65% que o
          // desenho poe no `8b` -- e e essa proporcao que faz o produto ler
          // como prontuario em vez de formulario.
          <p className="mt-0.5 font-mono text-base tabular-nums leading-tight text-ink">
            {value}
          </p>
        )}
        {detail && !stale && (
          <p className="mt-0.5 truncate font-mono text-micro tabular-nums text-muted">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}

type CreateSessionPanelProps = {
  availability: QuestionBankAvailability | null;
  loadingPreview: boolean;
  busy: boolean;
  clampedLimit: number;
  correctionMode: CorrectionMode;
  studyKind: StudyKind;
  canStartSession?: boolean;
  error?: string | null;
  startLabel: string;
  emptyReason?: string | null;
  /** Dá para começar, mas a sessão não sai do tamanho pedido. Ver `sessionBuilder`. */
  ressalva?: string | null;
  onRefreshAvailability: () => void;
  onPreviewQuestions: () => void;
  onStartSession: () => void;
  onRetry?: () => void;
};

export default function CreateSessionPanel({
  availability,
  loadingPreview,
  busy,
  clampedLimit,
  correctionMode,
  studyKind,
  canStartSession = true,
  error,
  startLabel,
  emptyReason,
  ressalva,
  onRefreshAvailability,
  onPreviewQuestions,
  onStartSession,
  onRetry,
}: CreateSessionPanelProps) {
  const canStart =
    !busy &&
    !loadingPreview &&
    canStartSession &&
    !!availability &&
    availability.available_count > 0;
  const estimatedMinutes = Math.max(10, Math.ceil(clampedLimit * 1.5));
  const modeLabel = CORRECTION_MODE_LABEL[correctionMode];
  const displayModeLabel = studyKind === "full_exam" ? "Prova institucional" : modeLabel;
  const distribution = availability
    ? `${availability.unanswered_count} novas · ${availability.answered_count} respondidas`
    : "Aguardando filtros";

  return (
    // `lg:col-start-2 lg:row-start-1` devolve o painel a coluna da direita no
    // desktop: no DOM ele passou a vir PRIMEIRO, para o telemovel abrir na
    // decisao, e sem a colocacao explicita a grelha o poria a esquerda.
    <aside className="border-y border-edge py-4 lg:sticky lg:top-6 lg:col-start-2 lg:row-start-1 lg:self-start lg:border-y-0 lg:border-l lg:py-0 lg:pl-5">
      {/* ⚠️ EMPILHA E CENTRA ABAIXO DE `sm`, como as outras linhas de
          rótulo+controlo do app (a "Aparência" do hub, os cabeçalhos do
          cronograma). O `justify-between` servia o desktop e espremia o
          controlo contra a margem direita a 390px.
      
          Centra a LINHA inteira, rótulo incluído: centrar só o controlo
          deixaria-o órfão do texto que diz o que ele faz. */}
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
        <div>
          <p className="paper-eyebrow">Sessão configurada</p>
          <h2 className="mt-1 font-serif font-semibold leading-tight">Resumo</h2>
          {loadingPreview ? (
            <div className="mt-2">
              <LoadBar label="Recalculando a prévia" className="w-40" />
            </div>
          ) : (
            <p className="mt-1 font-mono text-nota tabular-nums text-muted" aria-live="polite">
              {availabilityText(availability)}
            </p>
          )}
        </div>
        <Button type="button" variant="secondary" size="xs" onClick={onRefreshAvailability} disabled={loadingPreview || busy}>
          Recalcular
        </Button>
      </div>

      <div className="mt-4 space-y-2.5">
        <SummaryRow
          icon={<IconClipboard className="h-5 w-5" />}
          label="Número de questões"
          stale={loadingPreview}
          value={String(clampedLimit)}
          detail={availability ? `${availability.total_count} no filtro` : undefined}
        />
        <SummaryRow
          icon={<IconClock className="h-5 w-5" />}
          label="Tempo estimado"
          stale={loadingPreview}
          value={`${estimatedMinutes} min`}
          detail={displayModeLabel}
        />
        <SummaryRow
          icon={<IconChart className="h-5 w-5" />}
          label="Distribuição"
          stale={loadingPreview}
          value={distribution}
          detail={availability?.answer_status === "wrong" ? "Foco em erros recentes" : "Atualiza conforme os filtros"}
        />
      </div>

      {error && (
        <Alert
          variant="danger"
          className="mt-4"
          action={
            onRetry ? (
              /* ⚠️ BOTÃO, e não um link de 12px sublinhado.

                 Medido em produção em 2026-09-11: quando o banco de questões
                 fica indisponível (503 em `facets` e `availability`), esta é a
                 ÚNICA saída da tela — o `Começar` ao lado fica desactivado,
                 porque `availability` veio `null`. A saída de emergência era
                 `text-xs underline`, ~16px de alvo, no canto de um alerta.

                 O retry automático do cliente não cobre este caso: ele repete
                 uma vez honrando o `Retry-After: 5` da API, e a indisponibilidade
                 medida durou ~4 MINUTOS. Quem tem de poder tentar é o aluno. */
              <Button type="button" variant="secondary" size="md" onClick={onRetry}>
                Tentar novamente
              </Button>
            ) : undefined
          }
        >
          {error}
        </Alert>
      )}

      {/* Estado vazio explicado: zero questões com um botão desabilitado e sem
          motivo era o que fazia a tela parecer quebrada. */}
      {!error && emptyReason && (
        <p className="mt-4 border-l-2 border-edge pl-3 text-sm text-muted" aria-live="polite">
          {emptyReason}
        </p>
      )}

      {/* ⚠️ RESSALVA ≠ MOTIVO. O bloco acima diz por que NÃO dá para começar; este
          diz que dá, mas não como foi pedido. São estados diferentes e por isso
          são elementos diferentes — juntá-los faria o aluno ler um aviso de
          bloqueio num caso em que o botão está vivo. Só um dos dois aparece de
          cada vez, porque `emptyReason` exige acervo zero e a ressalva exige
          acervo entre 1 e o piso do modo. */}
      {!error && !emptyReason && ressalva && (
        <p className="mt-4 border-l-2 border-accent pl-3 text-sm text-muted" aria-live="polite">
          {ressalva}
        </p>
      )}

      {/* A secundaria fica no painel, junto do resumo sobre o qual age. */}
      <div className="mt-4">
        <Button type="button" variant="secondary" size="md" onClick={onPreviewQuestions} disabled={busy || !canStart} className="w-full">
          Ver prévia
        </Button>
      </div>

      {/* 🚨 REVERSAO DECLARADA: a acao primaria VOLTA para uma `BottomActionBar`.
          O comentario que vivia aqui dizia o contrario, e fica registado porque
          o motivo dele continua valido -- so' nao era este.

          O que ele dizia: este botao existiu com `hidden md:flex` porque uma
          `BottomActionBar` o DUPLICAVA no telemovel, e o rodape ficava com duas
          linhas de chrome mais um segundo botao a dizer a mesma coisa. O
          operador apontou, e a correcao foi "parar de duplicar".

          ⚠️ A queixa era a DUPLICACAO, e nao a barra. Agora o botao MUDA de
          sitio em vez de nascer um segundo: continua a existir exatamente um
          `/^Comecar/` na tela, que e' o que o e2e do Banco exige em regex
          estrita. E em 2026-09-11 o operador pediu explicitamente que este
          botao se comportasse como o `Pesquisar` do Caderno e o arranque dos
          flashcards -- os dois sao esta barra.

          ⚠️ A outra razao do comentario antigo TAMBEM continua atendida: a
          `banco/page.tsx` monta o resumo PRIMEIRO no DOM para o Banco abrir na
          decisao a 390px. Isso nao muda; a barra so' garante que a acao
          continua alcancavel depois de o aluno rolar ate' aos filtros. */}
      <BottomActionBar>
        <Button
          type="button"
          variant="primary"
          size="md"
          bloco
          onClick={onStartSession}
          disabled={busy || !canStart}
        >
          {busy ? "Preparando..." : startLabel}
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="butt" strokeLinejoin="miter" className="h-4 w-4" aria-hidden="true">
            <path d="M4 10h12" /><path d="m11 5 5 5-5 5" />
          </svg>
        </Button>
      </BottomActionBar>
    </aside>
  );
}
