"use client";

import { useCallback, useMemo, useState } from "react";
import {
  nextStudyImportFontPreset,
  readStudyImportFontPreset,
  studyImportAPlusIconClass,
  studyImportContentTextClass,
  type StudyImportFontPreset,
  writeStudyImportFontPreset,
} from "@/lib/studyImportFontPreset";

export type FontPresetState = {
  fontPreset: StudyImportFontPreset;
  contentTextClass: string;
  aPlusIconClass: string;
};

export type FontPresetActions = {
  cycleFontPreset: () => void;
};

export function useFontPreset(): [FontPresetState, FontPresetActions] {
  const [fontPreset, setFontPreset] = useState<StudyImportFontPreset>(() => readStudyImportFontPreset());

  const contentTextClass = useMemo(
    () => studyImportContentTextClass(fontPreset),
    [fontPreset],
  );

  const aPlusIconClass = useMemo(
    () => studyImportAPlusIconClass(fontPreset),
    [fontPreset],
  );

  const cycleFontPreset = useCallback(() => {
    setFontPreset((current) => {
      const next = nextStudyImportFontPreset(current);
      writeStudyImportFontPreset(next);
      return next;
    });
  }, []);

  return [
    { fontPreset, contentTextClass, aPlusIconClass },
    { cycleFontPreset },
  ];
}
