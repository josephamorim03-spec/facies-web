"use client";

import { useEffect, useState } from "react";
import { Bell, Calendar as CalendarClock, Check, Goal, NotepadText as Layers3, Save, Target } from "lucide-react";

import {
  getCapabilities,
  getFsrsConfig,
  getProfile,
  putFsrsConfig,
  updateProfile,
  type CapabilityStatus,
  type UserProfile,
  getAPIErrorMessage,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { BottomActionBar, BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";
import { Button } from "@/components/ui/Button";
import { ObjectiveSelector } from "@/components/objectives/ObjectiveSelector";
import { TargetExamSelector } from "@/components/objectives/TargetExamSelector";
import { PreferenceToggle, SectionTitle } from "@/app/preferencias/_components/campos";

/**
 * Preferências — a metade de `/preferencias` que pertence a VOCÊ.
 *
 * ## Por que a página se dividiu
 *
 * `preferencias/page.tsx` tinha 886 linhas e misturava duas naturezas:
 *
 * - **rotina** ("Minha semana", "Compromissos e metas") — é o insumo que
 *   dimensiona o dia, e por isso vive na **Conduta**, ao lado do plano que ela
 *   alimenta. O artboard `14a` já as desenha coladas;
 * - **preferência** (prova alvo, alertas, correção, cards) — é o produto se
 *   ajustando a quem você é, e isso é **Você**.
 *
 * Enquanto as duas dividiam um arquivo, metade delas aparecia na aba errada.
 *
 * ## Dividir o salvamento é seguro, e isso foi VERIFICADO
 *
 * `PATCH /api/profile` é remendo de verdade: o handler guarda cada campo com
 * `if body.X is not None` (`app/api/routers/profile.py`). Então esta página
 * enviar só o seu subconjunto **não apaga** o que a outra grava — que era o
 * risco capaz de matar a ideia, e ele não existe.
 *
 * A divisão dos campos segue a da tela:
 *
 * | aqui | lá (`/preferencias`) |
 * | --- | --- |
 * | alertas, recomendações, correção, confiança | meta semanal, plantão de 12h |
 * | retenção do FSRS | modo de remarcação |
 *
 * ⚠️ `confidence_timing` entra AQUI porque o controle dele entra aqui. Ele era
 * editado e nunca enviado — a escolha voltava sozinha no recarregamento
 * seguinte, sem erro nem aviso. O defeito foi corrigido antes da divisão, de
 * propósito: dividir primeiro o teria duplicado.
 */
export default function ContaPreferenciasPage() {
  const token = getAuthToken();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [objectivesCapability, setObjectivesCapability] = useState<CapabilityStatus | null>(null);
  const [targetExamCapability, setTargetExamCapability] = useState<CapabilityStatus | null>(null);
  const [retention, setRetention] = useState(0.9);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getProfile(token),
      getFsrsConfig(token),
      getCapabilities(token).catch(() => ({ capabilities: [] })),
    ])
      .then(([nextProfile, fsrs, capabilities]) => {
        setProfile(nextProfile);
        // ⚠️ `.catch` no fetch protege REJEIÇÃO, não resposta com outra forma.
        // Quando `getCapabilities` resolve sem o campo `capabilities`, o `.find`
        // estoura DENTRO do `.then` e a exceção cai no `.catch` de baixo, que a
        // imprime na tela. Foi assim que a página irmã já apareceu com "Cannot
        // read properties of undefined (reading 'find')" ao lado do Salvar.
        const capabilityList = Array.isArray(capabilities?.capabilities)
          ? capabilities.capabilities
          : [];
        setObjectivesCapability(
          capabilityList.find((item) => item.key === "student_objectives_v2") ?? null,
        );
        setTargetExamCapability(
          capabilityList.find((item) => item.key === "target_exam_v1") ?? null,
        );
        setRetention(fsrs.desired_retention);
      })
      .catch((cause) => {
        // A mensagem técnica vai para o console, nunca para o aluno: `cause`
        // pode carregar detalhe de rede, de provedor ou um TypeError nosso, e
        // nenhum deles diz ao aluno o que fazer.
        console.error("conta/preferencias: falha ao carregar", cause);
        setError("Não foi possível abrir as preferências. Tente recarregar a página.");
      })
      .finally(() => setLoading(false));
  }, [token]);

  function patchLocal(patch: Partial<UserProfile>) {
    setProfile((current) => (current ? { ...current, ...patch } : current));
    setSaved(false);
  }

  async function save() {
    // ⚠️ SEM `!token` AQUI, e a ausência é o conserto. `getAuthToken()` devolve
    // `""` POR DESENHO (`lib/auth.ts`): a sessão viaja no cookie httpOnly e o
    // token nunca chega ao JavaScript. Com `!token` na condição, ela era sempre
    // verdadeira e `save()` retornava na primeira linha — o botão "Salvar"
    // desta página não salvava nada, em nenhum clique. Quem cobra isto é o
    // `check-token-morto`, e era ele que segurava o `npm run lint`.
    if (!profile || saving) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const next = await updateProfile(token, {
        weekly_goal_notifications_enabled: profile.weekly_goal_notifications_enabled,
        calendar_change_alerts_enabled: profile.calendar_change_alerts_enabled,
        calendar_recommendations_enabled: profile.calendar_recommendations_enabled,
        default_feedback_timing: profile.default_feedback_timing,
        default_feedback_reveal_policy: profile.default_feedback_reveal_policy,
        confidence_timing: profile.confidence_timing,
        has_chosen_feedback_default: true,
      });
      await putFsrsConfig(token, { desired_retention: retention });
      setProfile(next);
      setSaved(true);
    } catch (cause) {
      console.error("conta/preferencias: falha ao salvar", cause);
      setError(getAPIErrorMessage(cause) ?? "Não foi possível salvar as preferências.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-5 py-8" aria-busy="true">
        <div className="h-9 w-56 paper-skeleton" />
        <div className="h-32 paper-skeleton border-y border-edge" />
        <div className="h-32 paper-skeleton border-y border-edge" />
      </div>
    );
  }

  if (!profile) {
    return (
      <p className="py-10 text-sm text-danger" role="alert">
        {error ?? "Preferências indisponíveis."}
      </p>
    );
  }

  return (
    <div className={`mx-auto max-w-4xl ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
      <div className="divide-y divide-edge">
        {targetExamCapability?.enabled ? (
          /* `id` e `scroll-mt`: `/mapa` manda quem ainda não declarou prova para
             cá, e sem âncora ele aterrissava no topo da página. O `scroll-mt`
             desconta o cabeçalho fixo, que senão cobre o título da seção.
             ⚠️ A âncora acompanhou a seção na mudança de página: quem apontar
             para `/preferencias#prova-alvo` agora cai numa página que não tem
             esta seção, e o navegador para no topo, calado. */
          <section id="prova-alvo" className="scroll-mt-24 py-7">
            <SectionTitle
              icon={Goal}
              title="Prova alvo"
              description="Escolha até três provas entre as que o banco de questões tem. Suas sessões passam a priorizar essas bancas, e a data ancora o cronograma."
            />
            <TargetExamSelector token={token} mode="preferences" />
          </section>
        ) : null}

        {/* Caminho canônico: só aparece quando existe edição editorial publicada.
            Antes disso, renderizar a seção mostrava um aviso de indisponibilidade
            sobre o qual o aluno não pode agir — ruído, não informação. */}
        {objectivesCapability?.enabled ? (
          <section className="py-7">
            <SectionTitle
              icon={Target}
              title="Objetivo de residência"
              description="Escolha instituição e programa; o processo, a edição e a data vêm do catálogo editorial verificado."
            />
            <ObjectiveSelector
              token={token}
              mode="preferences"
              capabilityEnabled={objectivesCapability?.enabled ?? false}
              capabilityReady={objectivesCapability?.can_start_action ?? false}
              unavailableReason={objectivesCapability?.reason}
            />
          </section>
        ) : null}

        <section className="py-7">
          <SectionTitle
            icon={Bell}
            title="Alertas"
            description="Os alertas importantes vêm ligados por padrão e podem ser silenciados aqui."
          />
          <div className="mt-2">
            <PreferenceToggle
              checked={profile.weekly_goal_notifications_enabled}
              onChange={(checked) => patchLocal({ weekly_goal_notifications_enabled: checked })}
              label="Meta semanal em risco"
              description="Avise quando o ritmo da semana indicar que a meta pode não ser alcançada."
            />
            <PreferenceToggle
              checked={profile.calendar_change_alerts_enabled}
              onChange={(checked) => patchLocal({ calendar_change_alerts_enabled: checked })}
              label="Mudanças bruscas no calendário"
              description="Peça confirmação para alterações que concentrem carga ou contrariem o planejamento."
            />
          </div>
        </section>

        <section className="py-7">
          <SectionTitle
            icon={CalendarClock}
            title="Recomendações e correção"
            description="Defina quanto o sistema participa do planejamento e quando o gabarito aparece na Prática."
          />
          <div className="mt-2">
            <PreferenceToggle
              checked={profile.calendar_recommendations_enabled}
              onChange={(checked) => patchLocal({ calendar_recommendations_enabled: checked })}
              label="Recomendações no calendário"
              description="Sugira sessões, provas e novos temas nos espaços adequados, sem agendar automaticamente."
            />
          </div>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-ink">
              Feedback padrão após o resultado
            </legend>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-control border border-edge bg-paper p-1">
              {(
                [
                  ["guided_choice", "Escolher por questão"],
                  ["reveal_all", "Revelar tudo ao finalizar"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`paper-control cursor-pointer px-3 py-3 text-center text-sm font-semibold transition-colors ${
                    profile.default_feedback_reveal_policy === value
                      ? "bg-primary text-primaryInk"
                      : "text-muted hover:bg-surfaceMuted hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="feedback-reveal-policy"
                    value={value}
                    checked={profile.default_feedback_reveal_policy === value}
                    onChange={() => patchLocal({ default_feedback_reveal_policy: value })}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="text-sm font-semibold text-ink">
              Quando declarar confiança
            </legend>
            {/* Dois eixos independentes: QUANDO ver o gabarito (acima) e QUANDO
                declarar confiança (aqui). Antes só existia o primeiro, e a etapa
                de confiança ficava presa a sessões de simulado, sem escolha. */}
            <p className="mt-1 max-w-[68ch] font-serif text-sm leading-6 text-muted">
              No fim, com a sessão inteira fresca e antes de qualquer gabarito, mede o quanto você
              sabe que sabe. A cada questão é outro ritmo: registra a dúvida no calor dela.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-control border border-edge bg-paper p-1">
              {(
                [
                  ["post_session", "No fim da sessão"],
                  ["per_question", "A cada questão"],
                ] as const
              ).map(([value, label]) => (
                <label
                  key={value}
                  className={`paper-control cursor-pointer px-3 py-3 text-center text-sm font-semibold transition-colors ${
                    profile.confidence_timing === value
                      ? "bg-primary text-primaryInk"
                      : "text-muted hover:bg-surfaceMuted hover:text-ink"
                  }`}
                >
                  <input
                    type="radio"
                    name="confidence-timing"
                    value={value}
                    checked={profile.confidence_timing === value}
                    onChange={() => patchLocal({ confidence_timing: value })}
                    className="sr-only"
                  />
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="py-7">
          <SectionTitle
            icon={Layers3}
            title="Cards"
            description="A retenção desejada controla o ritmo do FSRS somente nos flashcards."
          />
          <label className="mt-5 block max-w-xl">
            <span className="flex items-center justify-between gap-4 text-sm font-semibold text-ink">
              Retenção desejada
              <span>{Math.round(retention * 100)}%</span>
            </span>
            <input
              type="range"
              min="0.8"
              max="0.95"
              step="0.01"
              value={retention}
              onChange={(event) => {
                setRetention(Number(event.target.value));
                setSaved(false);
              }}
              className="mt-4 w-full accent-[var(--color-primary)]"
            />
            <span className="mt-2 block text-xs leading-5 text-muted">
              Valores maiores aumentam a frequência das revisões de Cards.
            </span>
          </label>
        </section>
      </div>

      <BottomActionBar
        maxWidthClassName="max-w-4xl"
        className="mt-4"
        status={
          <>
            {error ? (
              <span className="text-danger" role="alert">
                {error}
              </span>
            ) : saved ? (
              <span className="inline-flex items-center gap-2 text-success">
                <Check className="h-4 w-4" aria-hidden="true" />
                Preferências salvas
              </span>
            ) : (
              <span className="text-muted">Revise os ajustes antes de salvar.</span>
            )}
          </>
        }
      >
        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={save}
          disabled={saving}
          loading={saving}
          leftIcon={<Save className="h-4 w-4" aria-hidden="true" />}
          className="w-full sm:w-auto"
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </BottomActionBar>
    </div>
  );
}
