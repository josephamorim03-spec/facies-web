export type StudyImportFontPreset = "sm" | "md" | "lg";

export const STUDY_IMPORT_FONT_PRESET_STORAGE_KEY = "kros.study_import.font_preset";

const PRESET_CYCLE: StudyImportFontPreset[] = ["md", "lg", "sm"];

export function isStudyImportFontPreset(value: string | null | undefined): value is StudyImportFontPreset {
  return value === "sm" || value === "md" || value === "lg";
}

export function readStudyImportFontPreset(): StudyImportFontPreset {
  if (typeof window === "undefined") return "md";
  const raw = window.localStorage.getItem(STUDY_IMPORT_FONT_PRESET_STORAGE_KEY);
  if (isStudyImportFontPreset(raw)) return raw;
  return "md";
}

export function writeStudyImportFontPreset(preset: StudyImportFontPreset): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STUDY_IMPORT_FONT_PRESET_STORAGE_KEY, preset);
}

export function nextStudyImportFontPreset(current: StudyImportFontPreset): StudyImportFontPreset {
  const idx = PRESET_CYCLE.indexOf(current);
  if (idx < 0) return "md";
  return PRESET_CYCLE[(idx + 1) % PRESET_CYCLE.length];
}

export function studyImportContentTextClass(preset: StudyImportFontPreset): string {
  if (preset === "lg") return "text-[15px] leading-6";
  if (preset === "sm") return "text-xs leading-5";
  return "text-sm leading-6";
}

export function studyImportAPlusIconClass(preset: StudyImportFontPreset): string {
  if (preset === "lg") return "text-base";
  if (preset === "sm") return "text-xs";
  return "text-sm";
}
