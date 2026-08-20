"use client";

import { formatStudyImportDisplayText } from "@/lib/studyImportDisplayText";
import type { StudyImportQuestion } from "@/lib/api";

import { useStudyImportSession } from "./_hooks/useStudyImportSession";
import { useSwipeGestures, type OptionLetter } from "./_hooks/useSwipeGestures";
import { useFontPreset } from "./_hooks/useFontPreset";
import { IconFlagQuestion, IconScissors, IconGrid } from "./study-import-icons";

const SWIPE_REVEAL_PX = 36;

function normalizeImageRefs(rawRefs: string[] | null | undefined): string[] {
  return (rawRefs ?? [])
    .map((ref) => String(ref || "").trim())
    .filter((ref) => ref.length > 0);
}

function optionImageRefSet(question: StudyImportQuestion): Set<string> {
  const refs = new Set<string>();
  for (const optionRefs of Object.values(question.option_image_attachment_refs ?? {})) {
    for (const ref of normalizeImageRefs(optionRefs)) {
      refs.add(ref);
    }
  }
  return refs;
}

function generalImageRefsForQuestion(question: StudyImportQuestion): string[] {
  const optionRefs = optionImageRefSet(question);
  return normalizeImageRefs(question.image_attachment_refs).filter((ref) => !optionRefs.has(ref));
}

export default function ImportSessionPage() {
  const [state, refs, actions] = useStudyImportSession();
  const [swipeState, swipeActions] = useSwipeGestures();
  const [fontState, fontActions] = useFontPreset();

  const {
    token,
    loading,
    error,
    session,
    questionPage,
    pageSize,
    page,
    savingQuestion,
    finalizing,
    isPageTransitioning,
    pendingModalOpen,
    pendingNumbers,
    navDrawerOpen,
    imageUrls,
    imageErrors,
    loadingImageRefs,
    exitConfirmOpen,
    sessionTitle,
    sessionSubtitle,
    isLastPage,
    allAnswered,
    showFinalizar,
    visibleNumbers,
    currentNumbersSet,
    currentAnchorNumber,
  } = state;

  const {
    questionRefs,
    firstQuestionRef,
    pendingPageTopScrollRef,
    pendingScrollQuestionNumberRef,
  } = refs;

  const {
    goToPage,
    jumpToQuestionNumber,
    handleSelectOption,
    handleToggleEliminate,
    handleToggleDoubt,
    goToNextUnanswered,
    finalizeWithConfirm,
    requestExitConfirmation,
    confirmExit,
    cancelExit,
    setNavDrawerOpen,
    setPendingModalOpen,
    setPageSize,
    setIsPageTransitioning,
    setPage,
    isQuestionAnswered,
    isQuestionDoubtful,
    scrollQuestionIntoView,
  } = actions;

  const { contentTextClass, aPlusIconClass } = fontState;
  const { cycleFontPreset } = fontActions;

  const { openSwipeOption, swipePreview } = swipeState;
  const {
    handleOptionTouchStart,
    handleOptionTouchMove,
    handleOptionTouchEnd,
    closeSwipeOption,
  } = swipeActions;

  function isSameOption(
    left: { questionNumber: number; letter: OptionLetter } | null | undefined,
    right: { questionNumber: number; letter: OptionLetter } | null | undefined,
  ): boolean {
    if (!left || !right) return false;
    return left.questionNumber === right.questionNumber && left.letter === right.letter;
  }

  function renderImagePart(params: {
    attachmentRef: string;
    index: number;
    alt: string;
    mutedClass?: string;
  }) {
    const { attachmentRef, index, alt, mutedClass = "text-muted" } = params;
    const url = imageUrls[attachmentRef];
    const hasError = Boolean(imageErrors[attachmentRef]);
    const loadingPart = Boolean(loadingImageRefs[attachmentRef]);

    if (url) {
      return (
        <div key={attachmentRef} className="border border-edge p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={alt}
            className="w-full max-h-[460px] object-contain bg-paper"
          />
        </div>
      );
    }
    if (hasError) {
      return (
        <div key={attachmentRef} className={`border border-edge p-2 text-xs ${mutedClass}`}>
          Não foi possível carregar a imagem {index + 1} desta questão.
        </div>
      );
    }
    return (
      <div key={attachmentRef} className={`border border-edge p-2 text-xs ${mutedClass}`}>
        {loadingPart ? `Carregando imagem ${index + 1}...` : `Preparando imagem ${index + 1}...`}
      </div>
    );
  }

  if (token === null) {
    return (
      <div className="space-y-3">
        <h1 className="font-serif text-lg">Resolver prova importada</h1>
        <p className="text-sm text-muted">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-3 px-4 pb-16 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] sm:px-6 sm:pt-[calc(env(safe-area-inset-top,0px)+1rem)] lg:px-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <h1 className="font-serif text-lg">{sessionTitle}</h1>
          {session && <p className="text-xs text-muted">{sessionSubtitle}</p>}
        </div>
        <button
          type="button"
          onClick={() => requestExitConfirmation("/agenda-operacional")}
          className="text-xs border border-edge px-2 py-1 text-muted"
        >
          Voltar
        </button>
      </div>

      {/* Exam context banner — shows what was imported */}
      {session?.status === "active" && (session?.full_exam_name ?? session?.area) && (
        <p className="text-xs text-muted border border-edge px-3 py-1.5">
          {[
            session.full_exam_name,
            session.full_exam_year,
            session.area,
            session.theme,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {/* Toolbar */}
      <div className="sticky top-0 z-10 border-y border-edge bg-paper py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label htmlFor="page-size" className="text-xs text-muted">
              Qt./pág.
            </label>
            <select
              id="page-size"
              value={pageSize}
              onChange={(event) => {
                const next = Number(event.target.value);
                if (next !== 1 && next !== 5 && next !== 10) return;
                setPageSize(next);
                pendingPageTopScrollRef.current = true;
                pendingScrollQuestionNumberRef.current = null;
                setIsPageTransitioning(true);
                setPage(1);
              }}
              className="text-xs py-1"
            >
              <option value={1}>1</option>
              <option value={5}>5</option>
              <option value={10}>10</option>
            </select>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={cycleFontPreset}
              className="h-7 w-8 border border-edge inline-flex items-center justify-center text-muted hover:border-ink hover:text-ink"
              title="Alterar tamanho da fonte"
              aria-label="Alterar tamanho da fonte"
            >
              <span className={`font-semibold leading-none ${aPlusIconClass}`}>A+</span>
            </button>
            <button
              type="button"
              onClick={() => setNavDrawerOpen(true)}
              className="text-xs border border-edge px-2 py-1 text-muted inline-flex items-center gap-1 hover:border-ink hover:text-ink"
            >
              <IconGrid className="h-3.5 w-3.5" />
              Questões
            </button>
          </div>
        </div>
      </div>

      {/* Navigation drawer */}
      {navDrawerOpen && (
        <div className="fixed inset-0 z-[70]">
          <button
            type="button"
            aria-label="Fechar navegação"
            onClick={() => setNavDrawerOpen(false)}
            className="absolute inset-0 bg-black/40"
          />
          <aside className="absolute right-0 top-0 bottom-0 w-[min(88vw,22rem)] bg-paper border-l border-edge p-3 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-sm">Navegação</h2>
              <button
                type="button"
                onClick={() => setNavDrawerOpen(false)}
                className="text-xs border border-edge px-2 py-1 text-muted"
              >
                Voltar
              </button>
            </div>
            <div className="grid grid-cols-6 gap-1 overflow-y-auto pl-px pt-px pb-px pr-1">
              {visibleNumbers.map((number) => {
                const isVisible = currentNumbersSet.has(number);
                const answered = isQuestionAnswered(number);
                const doubtful = isQuestionDoubtful(number);
                const visualClass = doubtful
                  ? "border-warning bg-surfaceMuted text-warning"
                  : answered
                    ? "border-ink bg-ink text-paper"
                    : "border-edge bg-paper text-ink";
                return (
                  <button
                    key={number}
                    type="button"
                    onClick={() => jumpToQuestionNumber(number)}
                    disabled={isPageTransitioning}
                    className={`h-9 w-9 text-xs border flex items-center justify-center ${visualClass} ${
                      isVisible ? "ring-1 ring-ink" : ""
                    } disabled:opacity-50`}
                  >
                    {number}
                  </button>
                );
              })}
            </div>
          </aside>
        </div>
      )}

      {/* Loading / Error / Empty */}
      {loading && <p className="text-sm text-muted">Carregando...</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!loading && (questionPage?.items.length ?? 0) === 0 && (
        <p className="text-sm text-muted">Nenhuma questão encontrada.</p>
      )}

      {/* Questions */}
      <div className="space-y-3">
        {(questionPage?.items ?? []).map((question) => {
          const generalImageRefs = generalImageRefsForQuestion(question);
          return (
          <article
            key={question.question_number}
            data-testid={`study-import-question-${question.question_number}`}
            ref={(node) => {
              questionRefs.current[question.question_number] = node;
              if (question.question_number === currentAnchorNumber) {
                firstQuestionRef.current = node;
              }
            }}
            className="space-y-3 py-3 border-b border-edge scroll-mt-16"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Questão {question.question_number}</h2>
              <button
                type="button"
                onClick={() => handleToggleDoubt(question)}
                disabled={savingQuestion === question.question_number}
                title={question.state.doubtful ? "Dúvida marcada" : "Marcar dúvida"}
                className={`h-8 w-8 border flex items-center justify-center ${
                  question.state.doubtful
                    ? "border-warning bg-surfaceMuted text-warning"
                    : "border-edge text-muted hover:border-ink hover:text-ink"
                }`}
              >
                <IconFlagQuestion className="h-4 w-4" />
              </button>
            </div>

            {/* Images */}
            {question.has_image && generalImageRefs.length > 0 && (
              <div className="space-y-2">
                {generalImageRefs.map((ref, index) => {
                  const url = imageUrls[ref];
                  const hasError = Boolean(imageErrors[ref]);
                  const loadingPart = Boolean(loadingImageRefs[ref]);
                  if (url) {
                    return (
                      <div key={`${question.question_number}_${ref}`} className="border border-edge p-1">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Imagem da questão ${question.question_number} parte ${index + 1}`}
                          className="w-full max-h-[460px] object-contain bg-paper"
                        />
                      </div>
                    );
                  }
                  if (hasError) {
                    return (
                      <div
                        key={`${question.question_number}_${ref}`}
                        className="border border-edge p-2 text-xs text-muted"
                      >
                        Não foi possível carregar a imagem {index + 1} desta questão.
                      </div>
                    );
                  }
                  return (
                    <div
                      key={`${question.question_number}_${ref}`}
                      className="border border-edge p-2 text-xs text-muted"
                    >
                      {loadingPart
                        ? `Carregando imagem ${index + 1}...`
                        : `Preparando imagem ${index + 1}...`}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Stem */}
            <p
              className={`${contentTextClass} whitespace-pre-wrap break-words [overflow-wrap:anywhere] [text-align:justify]`}
            >
              {formatStudyImportDisplayText(question.stem)}
            </p>

            {/* Options */}
            <div className="border-y border-edge divide-y divide-edge">
              {(Object.keys(question.options) as OptionLetter[]).map((letter) => {
                const text = formatStudyImportDisplayText(question.options[letter]);
                const optionImageRefs = normalizeImageRefs(
                  question.option_image_attachment_refs?.[letter],
                );
                const selected = question.state.selected_option === letter;
                const eliminated = question.state.eliminated_options.includes(letter);
                const optionSelectionBlocked = eliminated && !selected;
                const optionKey = { questionNumber: question.question_number, letter };
                const isPreviewing = isSameOption(swipePreview, optionKey);
                const isOpen = isSameOption(openSwipeOption, optionKey);
                const offsetX = selected
                  ? 0
                  : (isPreviewing ? swipePreview?.offsetX : undefined) ??
                    (isOpen ? -SWIPE_REVEAL_PX : 0);
                const swipeProgress = selected
                  ? 0
                  : Math.max(0, Math.min(1, Math.abs(offsetX) / SWIPE_REVEAL_PX));
                return (
                  <div
                    key={letter}
                    className={`group relative overflow-hidden md:overflow-visible px-1 py-2 transition-colors ${
                      selected ? "bg-ink text-paper" : "bg-paper text-ink"
                    } ${eliminated ? "opacity-70" : ""}`}
                    onTouchStart={(e) =>
                      !selected &&
                      handleOptionTouchStart(e, question.question_number, letter)
                    }
                    onTouchMove={(e) =>
                      !selected &&
                      handleOptionTouchMove(e, question.question_number, letter)
                    }
                    onTouchEnd={() =>
                      !selected &&
                      handleOptionTouchEnd(question.question_number, letter)
                    }
                  >
                    <>
                        {/* Mobile: swipe-to-reveal */}
                        <div
                          className="md:hidden absolute inset-y-0 right-0 w-9 flex items-center justify-center"
                          style={{ opacity: swipeProgress }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              handleToggleEliminate(question, letter);
                              closeSwipeOption();
                            }}
                            disabled={savingQuestion === question.question_number}
                            title={eliminated ? "Desfazer corte" : "Cortar alternativa"}
                            className={`${
                              eliminated ? "text-ink" : "text-muted hover:text-ink"
                            } disabled:opacity-40`}
                          >
                            <IconScissors className="h-4 w-4" />
                          </button>
                        </div>
                        {/* Desktop: hover-to-reveal */}
                        <div className="hidden md:flex absolute inset-y-0 -right-9 w-9 items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-100">
                          <button
                            type="button"
                            onClick={() => handleToggleEliminate(question, letter)}
                            disabled={savingQuestion === question.question_number}
                            title={eliminated ? "Desfazer corte" : "Cortar alternativa"}
                            className={`${
                              eliminated ? "text-ink" : "text-muted hover:text-ink"
                            } disabled:opacity-40`}
                          >
                            <IconScissors className="h-4 w-4" />
                          </button>
                        </div>
                    </>
                    <button
                      type="button"
                      data-testid={`study-import-option-${question.question_number}-${letter}`}
                      onClick={() => handleSelectOption(question, letter)}
                      disabled={
                        savingQuestion === question.question_number ||
                        optionSelectionBlocked
                      }
                      className={`w-full text-left ${
                        optionSelectionBlocked ? "cursor-not-allowed" : ""
                      }`}
                      style={{
                        transform: `translateX(${offsetX}px)`,
                        transition: isPreviewing ? "none" : "transform 160ms ease",
                      }}
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center border text-xs ${
                            selected
                              ? "border-paper text-paper"
                              : "border-edge text-ink"
                          }`}
                          style={{
                            opacity: 1 - swipeProgress,
                            transition: isPreviewing ? "none" : "opacity 160ms ease",
                          }}
                        >
                          {letter}
                        </span>
                        <div className="min-w-0 flex-1 space-y-2">
                          <p
                            className={`${contentTextClass} whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${
                              selected ? "text-paper" : "text-ink"
                            } ${eliminated ? "line-through text-muted" : ""} [text-align:justify]`}
                          >
                            {text}
                          </p>
                          {optionImageRefs.length > 0 && (
                            <div className="space-y-2">
                              {optionImageRefs.map((ref, index) =>
                                renderImagePart({
                                  attachmentRef: ref,
                                  index,
                                  alt: `Imagem da alternativa ${letter} da questão ${question.question_number} parte ${index + 1}`,
                                  mutedClass: selected ? "text-paper" : "text-muted",
                                }),
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </article>
          );
        })}
      </div>

      {/* Pagination + Finalize */}
      <div
        className="sticky z-10 flex flex-col gap-1.5 border-y border-edge bg-paper py-2"
        style={{
          bottom: "0",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.5cm)",
        }}
      >
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <button
            type="button"
            data-testid="study-import-prev-page"
            onClick={() => goToPage(page - 1)}
            disabled={!questionPage || page <= 1 || isPageTransitioning}
            className="justify-self-start whitespace-nowrap text-xs border border-edge px-2 py-1 disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="min-w-0 text-center text-xs text-muted">
            {questionPage
              ? `Página ${page} de ${questionPage.total_pages}`
              : "Carregando…"}
          </span>
          <button
            type="button"
            data-testid="study-import-next-page"
            onClick={() => goToPage(page + 1)}
            disabled={
              !questionPage ||
              page >= (questionPage?.total_pages ?? 1) ||
              isPageTransitioning
            }
            className="justify-self-end whitespace-nowrap text-xs border border-edge px-2 py-1 disabled:opacity-50"
          >
            Próxima
          </button>
        </div>
        {showFinalizar && (
          <div className="flex justify-center">
            <button
              type="button"
              data-testid="study-import-finalize"
              onClick={() => finalizeWithConfirm(false)}
              disabled={finalizing || isPageTransitioning}
              className="whitespace-nowrap text-xs border border-ink px-3 py-1 disabled:opacity-50"
            >
              {finalizing ? "Finalizando..." : "Finalizar"}
            </button>
          </div>
        )}
      </div>

      {/* Exit confirmation modal */}
      {exitConfirmOpen && (
        <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Confirmar saída da sessão"
            className="bg-paper border border-edge w-full max-w-md p-4 space-y-4"
          >
            <p className="text-sm">
              Deseja sair da sessão? A atividade será perdida
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={cancelExit}
                className="text-xs border border-edge px-3 py-1.5"
              >
                Continuar
              </button>
              <button
                type="button"
                onClick={confirmExit}
                className="text-xs border border-danger text-danger px-3 py-1.5 hover:bg-surfaceMuted"
              >
                Sair da sessão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending unanswered modal */}
      {pendingModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onKeyDown={(e) => {
            if (e.key === "Escape") setPendingModalOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-label="Questões em branco"
            className="bg-paper border border-edge w-full max-w-md p-4 space-y-3"
          >
            <h2 className="font-serif text-base">Existem questões em branco</h2>
            <p className="text-sm text-muted">
              Você tem {pendingNumbers.length} questões em branco.
            </p>
            <div className="flex flex-wrap gap-1">
              {pendingNumbers.map((number) => (
                <button
                  key={number}
                  type="button"
                  onClick={() => {
                    jumpToQuestionNumber(number);
                    setPendingModalOpen(false);
                  }}
                  className="text-xs border border-edge text-ink px-2 py-0.5"
                >
                  {number}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={goToNextUnanswered}
                className="text-xs border border-edge px-2 py-1"
              >
                Ir para próxima em branco
              </button>
              <button
                type="button"
                onClick={() => finalizeWithConfirm(true)}
                disabled={finalizing}
                className="text-xs border border-ink px-2 py-1"
              >
                Finalizar mesmo assim
              </button>
              <button
                type="button"
                onClick={() => setPendingModalOpen(false)}
                className="text-xs text-muted px-2 py-1"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
