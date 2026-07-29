"use client";

import React from "react";
import type { OperationalSourceType } from "@/lib/api";
import type { Area } from "./_lib/cadernoShared";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { useCadernoPageState } from "./_hooks/useCadernoPageState";
import { TurboReviewPanel } from "./_components/TurboReviewPanel";
import { CadernoHeader } from "./_components/CadernoHeader";
import { CadernoRegistroPanel, CadernoRegistroSkeletonPanel } from "./_components/CadernoRegistroPanel";
import { CadernoPesquisarPanel, CadernoPesquisarSkeletonPanel } from "./_components/CadernoPesquisarPanel";
import { CadernoNoteList } from "./_components/CadernoNoteList";
import { CardsSectionTabs } from "../CardsSectionTabs";
import { BOTTOM_ACTION_BAR_RESERVE_CLASS } from "@/components/ui/BottomActionBar";

export default function CadernoClientPage() {
  const {
    tab,
    setTabWithSession,
    turbo,
    turboSessionStarted,
    token,
    error,
    loading,
    saving,
    notes,
    area,
    setArea,
    theme,
    setTheme,
    sourceType,
    setSourceType,
    questionOutcome,
    setQuestionOutcome,
    insightQuestion,
    setInsightQuestion,
    body,
    setBody,
    weight,
    setWeight,
    questionId,
    setQuestionId,
    externalLinksInput,
    setExternalLinksInput,
    fileInputRef,
    pickedFiles,
    fileError,
    showThemeSuggestions,
    setShowThemeSuggestions,
    showAdvanced,
    setShowAdvanced,
    themeSuggestions,
    filterAreas,
    setFilterAreas,
    filterTheme,
    setFilterTheme,
    filterSourceType,
    setFilterSourceType,
    filterOutcome,
    setFilterOutcome,
    filterWeightMin,
    setFilterWeightMin,
    filterFrom,
    setFilterFrom,
    filterTo,
    setFilterTo,
    hasSearched,
    searchLoading,
    sortTime,
    setSortTime,
    sortWeight,
    setSortWeight,
    searchResultsRef,
    runSearch,
    flashcardReviewNoteIds,
    flashcardReviewCount,
    handleCreateNote,
    handleFileChange,
    deletingNoteId,
    pendingDeleteNoteId,
    setPendingDeleteNoteId,
    handleDeleteNote,
    confirmDeleteNote,
    editingNote,
    setEditingNote,
    editSaving,
    handleSaveEdit,
    openReviewMode,
    closeTurboMode,
    handleTurboStart,
    pendingTurboDeck,
    turboNote,
    turboLoading,
    turboFeedback,
    turboRevealed,
    setTurboRevealed,
    sessionCorrect,
    sessionIncorrect,
    sessionDone,
    canRepeatSession,
    canNavigatePrev,
    canNavigateNext,
    isStandbyRound,
    currentCardContext,
    lastReviewChange,
    reviewChanges,
    isActionLocked,
    cardTimings,
    areaStats,
    deckSize,
    navigatePrev,
    navigateNext,
    rateCard,
    repeatSession,
  } = useCadernoPageState();

  // Turbo mode overlay
  if (turbo) {
    return (
      <TurboReviewPanel
        turboLoading={turboLoading}
        turboFeedback={turboFeedback}
        turboNote={turboNote}
        turboRevealed={turboRevealed}
        sessionCorrect={sessionCorrect}
        sessionIncorrect={sessionIncorrect}
        sessionDone={sessionDone}
        canRepeatSession={canRepeatSession}
        isStandbyRound={isStandbyRound}
        isActionLocked={isActionLocked}
        isTurboMode={false}
        availableCount={pendingTurboDeck.length}
        currentCardContext={currentCardContext}
        lastReviewChange={lastReviewChange}
        reviewChanges={reviewChanges}
        deckSize={deckSize}
        cardTimings={cardTimings}
        canSwipePrev={canNavigatePrev}
        canSwipeNext={canNavigateNext}
        sessionStarted={turboSessionStarted}
        onCloseAction={closeTurboMode}
        onRevealAction={() => setTurboRevealed(true)}
        onStartAction={handleTurboStart}
        onStartRepeatAction={repeatSession}
        onNavigatePrevAction={navigatePrev}
        onNavigateNextAction={navigateNext}
        onRateAction={rateCard}
        areaStats={areaStats}
        token={token}
      />
    );
  }

  // Main notebook
  return (
    <div className={`space-y-5 ${BOTTOM_ACTION_BAR_RESERVE_CLASS}`}>
      <CardsSectionTabs active="records" />
      <CadernoHeader
        tab={tab}
        onEnterSearch={() => setTabWithSession("pesquisar")}
        onExitSearch={() => setTabWithSession("registro")}
      />

      {error && <p className="text-sm text-ink">{error}</p>}

      {/* REGISTRO */}
      {tab === "registro" && !loading && (
        <CadernoRegistroPanel
          area={area}
          onAreaChange={(a) => setArea(a as Area | "")}
          theme={theme}
          onThemeChange={setTheme}
          showThemeSuggestions={showThemeSuggestions}
          onShowThemeSuggestionsChange={setShowThemeSuggestions}
          themeSuggestions={themeSuggestions}
          onThemeSuggestionSelect={(s) => { setTheme(s); setShowThemeSuggestions(false); }}
          sourceType={sourceType as OperationalSourceType}
          onSourceTypeChange={(t) => { setSourceType(t); if (t !== "question") setQuestionOutcome(""); }}
          questionOutcome={questionOutcome}
          onQuestionOutcomeChange={(v) => setQuestionOutcome(v as "" | "correct" | "incorrect")}
          insightQuestion={insightQuestion}
          onInsightQuestionChange={setInsightQuestion}
          body={body}
          onBodyChange={setBody}
          weight={weight}
          onWeightChange={setWeight}
          showAdvanced={showAdvanced}
          onShowAdvancedChange={setShowAdvanced}
          questionId={questionId}
          onQuestionIdChange={setQuestionId}
          externalLinksInput={externalLinksInput}
          onExternalLinksInputChange={setExternalLinksInput}
          fileInputRef={fileInputRef}
          pickedFiles={pickedFiles}
          fileError={fileError}
          onFilePick={() => fileInputRef.current?.click()}
          onFileChange={(files) => handleFileChange(files)}
          saving={saving}
          onCreateNote={() => void handleCreateNote()}
        />
      )}
      {tab === "registro" && loading && <CadernoRegistroSkeletonPanel />}

      {/* PESQUISAR */}
      {tab === "pesquisar" && !loading && (
        <CadernoPesquisarPanel
          filterAreas={filterAreas}
          onFilterAreasChange={setFilterAreas}
          filterTheme={filterTheme}
          onFilterThemeChange={setFilterTheme}
          sortTime={sortTime}
          onSortTimeChange={setSortTime}
          sortWeight={sortWeight}
          onSortWeightChange={setSortWeight}
          filterSourceType={filterSourceType}
          onFilterSourceTypeChange={(v) => setFilterSourceType(v as "" | OperationalSourceType)}
          filterOutcome={filterOutcome}
          onFilterOutcomeChange={(v) => setFilterOutcome(v as "" | "correct" | "incorrect")}
          filterWeightMin={filterWeightMin}
          onFilterWeightMinChange={setFilterWeightMin}
          filterFrom={filterFrom}
          onFilterFromChange={setFilterFrom}
          filterTo={filterTo}
          onFilterToChange={setFilterTo}
          onClearPeriod={() => { setFilterFrom(""); setFilterTo(""); }}
          searchLoading={searchLoading}
          onSearch={() => { void runSearch(); }}
        >
          <CadernoNoteList
            notes={notes}
            hasSearched={hasSearched}
            searchLoading={searchLoading}
            searchResultsRef={searchResultsRef}
            flashcardReviewCount={flashcardReviewCount}
            flashcardReviewNoteIds={flashcardReviewNoteIds}
            onOpenReviewMode={openReviewMode}
            editingNote={editingNote}
            editSaving={editSaving}
            onSaveEdit={(noteId, payload) => void handleSaveEdit(noteId, payload)}
            onCancelEdit={() => setEditingNote(null)}
            onEditNote={setEditingNote}
            onDeleteNote={(noteId) => void handleDeleteNote(noteId)}
            deletingNoteId={deletingNoteId}
            token={token}
          />
        </CadernoPesquisarPanel>
      )}
      {tab === "pesquisar" && loading && <CadernoPesquisarSkeletonPanel />}

      <ConfirmDialog
        open={pendingDeleteNoteId !== null}
        title="Apagar nota"
        message="Apagar nota permanentemente? Esta ação não poderá ser desfeita."
        cancelLabel="Cancelar"
        confirmLabel="Apagar"
        onCancel={() => setPendingDeleteNoteId(null)}
        onConfirm={() => void confirmDeleteNote()}
      />
    </div>
  );
}
