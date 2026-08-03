import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  createOperationalNote,
  deleteOperationalNote,
  inferOperationalAttachmentContentType,
  listDirectedStudies,
  listOperationalNotes,
  OperationalNoteItem,
  OperationalSourceType,
  presignOperationalAttachment,
  putOperationalAttachmentBinary,
  updateOperationalNote,
} from "@/lib/api";
import { getAuthToken } from "@/lib/auth";
import { setReviewSessionActive } from "@/lib/studyImportRuntime";

import { useTurboSession } from "./useTurboSession";
import {
  Area,
  MAX_FILE_BYTES,
  MAX_FILE_MB,
  MANUAL_TURBO_MIN_CARDS,
  normalizeThemeKey,
  SortTime,
  SortWeight,
  Tab,
} from "../_lib/cadernoShared";

const CADERNO_TAB_SESSION_KEY = "caderno_tab";

function isCadernoTab(value: string | null): value is Tab {
  return value === "registro" || value === "pesquisar";
}

export function useCadernoPageState() {
  const [tab, setTab] = useState<Tab>("registro");
  const [turbo, setTurbo] = useState(false);
  const [turboSessionStarted, setTurboSessionStarted] = useState(false);
  const [token, setToken] = useState("");
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState<OperationalNoteItem[]>([]);
  const [studyThemes, setStudyThemes] = useState<Array<{ area: string; theme: string }>>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchResultsRef = useRef<HTMLDivElement | null>(null);
  const [shouldScrollToResults, setShouldScrollToResults] = useState(false);

  // Create form
  const [area, setArea] = useState<Area | "">("");
  const [theme, setTheme] = useState("");
  const [sourceType, setSourceType] = useState<OperationalSourceType>("reading");
  const [questionOutcome, setQuestionOutcome] = useState<"" | "correct" | "incorrect">("");
  const [insightQuestion, setInsightQuestion] = useState("");
  const [body, setBody] = useState("");
  const [weight, setWeight] = useState(6);
  const [questionId, setQuestionId] = useState("");
  const [externalLinksInput, setExternalLinksInput] = useState("");
  const [pickedFiles, setPickedFiles] = useState<File[]>([]);
  const [fileError, setFileError] = useState("");
  const [showThemeSuggestions, setShowThemeSuggestions] = useState(false);

  // Filters
  const [filterAreas, setFilterAreas] = useState<Set<Area>>(new Set());
  const [filterTheme, setFilterTheme] = useState("");
  const [filterSourceType, setFilterSourceType] = useState<"" | OperationalSourceType>("");
  const [filterOutcome, setFilterOutcome] = useState<"" | "correct" | "incorrect">("");
  const [filterWeightMin, setFilterWeightMin] = useState<number>(1);
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  // Sort - independent dimensions
  const [sortTime, setSortTime] = useState<SortTime>("");
  const [sortWeight, setSortWeight] = useState<SortWeight>("");

  // Delete / Edit
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<string | null>(null);
  const [editingNote, setEditingNote] = useState<OperationalNoteItem | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => {
    setToken(getAuthToken());
    setAuthReady(true);
  }, []);

  useEffect(() => {
    try {
      const savedTab = sessionStorage.getItem(CADERNO_TAB_SESSION_KEY);
      if (isCadernoTab(savedTab)) {
        setTab(savedTab);
      } else {
        sessionStorage.removeItem(CADERNO_TAB_SESSION_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  function setTabWithSession(nextTab: Tab) {
    setTab(nextTab);
    try {
      sessionStorage.setItem(CADERNO_TAB_SESSION_KEY, nextTab);
    } catch {
      // ignore storage errors
    }
  }

  const themeSuggestions = useMemo(() => {
    const map = new Map<string, string>();
    for (const item of notes) {
      if (item.area === area && item.theme?.trim()) {
        const key = normalizeThemeKey(item.theme);
        if (key && !map.has(key)) map.set(key, item.theme.trim());
      }
    }
    for (const item of studyThemes) {
      if (item.area === area && item.theme?.trim()) {
        const key = normalizeThemeKey(item.theme);
        if (key && !map.has(key)) map.set(key, item.theme.trim());
      }
    }
    const typed = normalizeThemeKey(theme);
    if (!typed) return [] as string[];
    return Array.from(map.entries())
      .filter(([key]) => key.startsWith(typed) || key.includes(typed))
      .map(([, label]) => label)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .slice(0, 8);
  }, [notes, studyThemes, area, theme]);

  useEffect(() => {
    setReviewSessionActive(turbo && turboSessionStarted);
    return () => { setReviewSessionActive(false); };
  }, [turbo, turboSessionStarted]);

  const flashcardReviewNoteIds = useMemo(
    () => notes.filter((n) => n.insight_question).map((n) => n.note_id),
    [notes],
  );
  const flashcardReviewCount = flashcardReviewNoteIds.length;

  const loadBaseData = useCallback(async (t: string) => {
    const s = await listDirectedStudies(t);
    setStudyThemes(s.map((x) => ({ area: x.area, theme: x.theme })));
  }, []);

  const loadNotes = useCallback(async (t: string, tw: SortTime, ww: SortWeight) => {
    // API handles time sort; weight sort is applied client-side for compound ordering
    const singleArea = filterAreas.size === 1 ? [...filterAreas][0] : undefined;
    const rows = await listOperationalNotes(t, {
      area: singleArea,
      theme: filterTheme || undefined,
      source_type: filterSourceType || undefined,
      question_outcome: filterOutcome || undefined,
      weight_min: filterWeightMin,
      created_from: filterFrom || undefined,
      created_to: filterTo || undefined,
      sort: tw || undefined,
      limit: 300,
    });
    // Client-side multi-area filter when 2-5 areas selected
    const filtered = filterAreas.size > 1 ? rows.filter((n) => filterAreas.has(n.area as Area)) : rows;
    // Stable client-side weight sort preserves time order as tiebreaker
    if (ww === "desc") filtered.sort((a, b) => b.weight - a.weight);
    else if (ww === "asc") filtered.sort((a, b) => a.weight - b.weight);
    setNotes(filtered);
  }, [filterAreas, filterTheme, filterSourceType, filterOutcome, filterWeightMin, filterFrom, filterTo]);

  useEffect(() => {
    if (!authReady) return;
    setLoading(true);
    setNotes([]);
    setHasSearched(false);
    Promise.all([loadBaseData(token)])
      .catch((e: unknown) => setError((e as Error)?.message ?? "Erro ao carregar."))
      .finally(() => setLoading(false));
  }, [authReady, token, loadBaseData]);

  useEffect(() => {
    setHasSearched(false);
    setShouldScrollToResults(false);
  }, [filterAreas, filterTheme, filterSourceType, filterOutcome, filterWeightMin, filterFrom, filterTo, sortTime, sortWeight]);

  useEffect(() => {
    if (!shouldScrollToResults || !hasSearched) return;
    const target = searchResultsRef.current;
    if (!target) return;
    const frame = window.requestAnimationFrame(() => {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    setShouldScrollToResults(false);
    return () => window.cancelAnimationFrame(frame);
  }, [shouldScrollToResults, hasSearched, notes.length]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(""), 8000);
    const dismiss = () => setError("");
    document.addEventListener("click", dismiss, { once: true });
    return () => { clearTimeout(timer); document.removeEventListener("click", dismiss); };
  }, [error]);

  async function runSearch() {
    setSearchLoading(true);
    setError("");
    try {
      await loadNotes(token, sortTime, sortWeight);
      setHasSearched(true);
      setShouldScrollToResults(true);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Erro ao pesquisar.");
    } finally {
      setSearchLoading(false);
    }
  }

  function handleFileChange(files: FileList | null) {
    setFileError("");
    if (!files) { setPickedFiles([]); return; }
    const arr = Array.from(files);
    const oversized = arr.filter((f) => f.size > MAX_FILE_BYTES);
    if (oversized.length > 0) {
      setFileError(`Acima de ${MAX_FILE_MB} MB: ${oversized.map((f) => f.name).join(", ")}`);
      setPickedFiles([]);
      return;
    }
    setPickedFiles(arr);
  }

  async function handleCreateNote() {
    setError("");
    if (!area) { setError("Selecione uma Área."); return; }
    if (!theme.trim() || !body.trim() || !insightQuestion.trim()) {
      setError("Preencha tema, anotação e o que não sabia.");
      return;
    }
    setSaving(true);
    try {
      const uploadedRefs: string[] = [];
      for (const file of pickedFiles) {
        const presigned = await presignOperationalAttachment(token, {
          filename: file.name,
          content_type: inferOperationalAttachmentContentType(file),
          size_bytes: file.size,
        });
        await putOperationalAttachmentBinary(presigned.upload_url, {
          method: presigned.method,
          headers: presigned.headers,
          body: file,
        });
        uploadedRefs.push(presigned.attachment_refs);
      }
      const extLinks = externalLinksInput.split(/\n|,/g).map((s) => s.trim()).filter(Boolean);
      await createOperationalNote(token, {
        area: area as Area,
        theme: theme.trim(),
        source_type: sourceType,
        question_outcome: sourceType === "question" ? (questionOutcome || null) : null,
        insight_question: insightQuestion.trim(),
        body: body.trim(),
        weight,
        question_id: questionId.trim() || null,
        external_links: extLinks,
        attachment_refs: uploadedRefs,
      });
      setTheme("");
      setInsightQuestion("");
      setBody("");
      setQuestionId("");
      setExternalLinksInput("");
      setPickedFiles([]);
      setWeight(6);
      setQuestionOutcome("");
      setShowAdvanced(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await Promise.all([loadNotes(token, sortTime, sortWeight), loadBaseData(token)]);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Erro ao salvar nota.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (deletingNoteId) return;
    setPendingDeleteNoteId(noteId);
  }

  async function confirmDeleteNote() {
    if (!pendingDeleteNoteId) {
      setPendingDeleteNoteId(null);
      return;
    }
    const noteId = pendingDeleteNoteId;
    setPendingDeleteNoteId(null);
    setDeletingNoteId(noteId);
    try {
      await deleteOperationalNote(token, noteId);
      setNotes((prev) => prev.filter((n) => n.note_id !== noteId));
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Erro ao apagar nota.");
    } finally {
      setDeletingNoteId(null);
    }
  }

  async function handleSaveEdit(noteId: string, payload: Parameters<typeof updateOperationalNote>[2]) {
    setEditSaving(true);
    try {
      const updated = await updateOperationalNote(token, noteId, payload);
      setNotes((prev) => prev.map((n) => (n.note_id === noteId ? updated : n)));
      setEditingNote(null);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Erro ao salvar edição.");
    } finally {
      setEditSaving(false);
    }
  }

  // ── Turbo review from pesquisar ──
  const syncAfterTurboAction = useCallback(async () => {
    await Promise.all([loadNotes(token, sortTime, sortWeight), loadBaseData(token)]);
  }, [token, sortTime, sortWeight, loadBaseData, loadNotes]);

  const [pendingTurboDeck, setPendingTurboDeck] = useState<OperationalNoteItem[]>([]);

  const {
    note: turboNote,
    turboLoading,
    turboFeedback,
    turboRevealed,
    setTurboRevealed,
    sessionCorrect,
    sessionIncorrect,
    sessionTotal,
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
    startSession,
    submitAction,
    navigateSession,
    startRepeat,
    resetSession,
  } = useTurboSession({
    token,
    onPostActionSync: syncAfterTurboAction,
  });

  function openReviewMode(noteIds: string[]) {
    if (noteIds.length < MANUAL_TURBO_MIN_CARDS) return;
    setError("");
    const idSet = new Set(noteIds);
    setPendingTurboDeck(notes.filter((n) => idSet.has(n.note_id)));
    setTurbo(true);
  }

  function closeTurboMode() {
    setTurbo(false);
    setTurboSessionStarted(false);
    setPendingTurboDeck([]);
    resetSession();
  }

  async function handleTurboStart(count: number) {
    const noteIds = pendingTurboDeck.slice(0, count).map((note) => note.note_id);
    if (noteIds.length < MANUAL_TURBO_MIN_CARDS) {
      setError(`Selecione pelo menos ${MANUAL_TURBO_MIN_CARDS} cards para iniciar a revisão.`);
      return;
    }
    setPendingTurboDeck([]);
    setTurboSessionStarted(true);
    await startSession(noteIds);
  }

  return {
    tab,
    setTabWithSession,
    turbo,
    turboSessionStarted,
    token,
    error,
    setError,
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
    deckSize: sessionTotal,
    navigatePrev: () => void navigateSession("prev"),
    navigateNext: () => void navigateSession("next"),
    rateCard: submitAction,
    repeatSession: startRepeat,
  };
}
