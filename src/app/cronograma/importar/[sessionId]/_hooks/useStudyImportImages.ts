"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";

import {
  resolveOperationalAttachmentDisplayUrl,
  type StudyImportQuestionPage,
} from "@/lib/api";

export type StudyImportImageState = {
  imageUrls: Record<string, string>;
  imageErrors: Record<string, boolean>;
  loadingImageRefs: Record<string, boolean>;
  visibleImageRefs: string[];
};

export type StudyImportImageRefs = {
  imageFetchInFlightRef: MutableRefObject<Set<string>>;
  blobUrlsByRef: MutableRefObject<Record<string, string>>;
};

type Args = {
  token: string | null;
  questionPage: StudyImportQuestionPage | null;
};

export function useStudyImportImages({ token, questionPage }: Args): {
  state: StudyImportImageState;
  refs: StudyImportImageRefs;
  resetImages: () => void;
} {
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const [loadingImageRefs, setLoadingImageRefs] = useState<Record<string, boolean>>({});

  const imageFetchInFlightRef = useRef<Set<string>>(new Set());
  const blobUrlsByRef = useRef<Record<string, string>>({});

  const visibleImageRefs = useMemo(() => {
    const refs = new Set<string>();
    for (const question of questionPage?.items ?? []) {
      for (const ref of question.image_attachment_refs ?? []) {
        const normalized = String(ref || "").trim();
        if (normalized) refs.add(normalized);
      }
      for (const optionRefs of Object.values(question.option_image_attachment_refs ?? {})) {
        for (const ref of optionRefs ?? []) {
          const normalized = String(ref || "").trim();
          if (normalized) refs.add(normalized);
        }
      }
    }
    return Array.from(refs.values()).sort();
  }, [questionPage?.items]);

  const resetImages = useCallback(() => {
    imageFetchInFlightRef.current.clear();
    const previous = Object.values(blobUrlsByRef.current);
    for (const url of previous) {
      URL.revokeObjectURL(url);
    }
    blobUrlsByRef.current = {};
    setImageUrls({});
    setImageErrors({});
    setLoadingImageRefs({});
  }, []);

  useEffect(() => {
    if (token === null || visibleImageRefs.length === 0) return;
    const pending = visibleImageRefs.filter(
      (ref) =>
        !imageUrls[ref] &&
        !imageErrors[ref] &&
        !loadingImageRefs[ref] &&
        !imageFetchInFlightRef.current.has(ref),
    );
    if (pending.length === 0) return;

    for (const ref of pending) {
      imageFetchInFlightRef.current.add(ref);
      setLoadingImageRefs((prev) => {
        if (prev[ref]) return prev;
        return { ...prev, [ref]: true };
      });
      (async () => {
        try {
          const resolved = await resolveOperationalAttachmentDisplayUrl(token, ref);
          setImageUrls((prev) => {
            const previous = prev[ref];
            if (previous && previous.startsWith("blob:")) {
              URL.revokeObjectURL(previous);
            }
            return { ...prev, [ref]: resolved.url };
          });
          const previousBlobUrl = blobUrlsByRef.current[ref];
          if (previousBlobUrl && previousBlobUrl !== resolved.url) {
            URL.revokeObjectURL(previousBlobUrl);
          }
          if (resolved.revoke) {
            blobUrlsByRef.current[ref] = resolved.url;
          } else {
            delete blobUrlsByRef.current[ref];
          }
        } catch {
          setImageErrors((prev) => ({ ...prev, [ref]: true }));
        } finally {
          imageFetchInFlightRef.current.delete(ref);
          setLoadingImageRefs((prev) => {
            if (!prev[ref]) return prev;
            const next = { ...prev };
            delete next[ref];
            return next;
          });
        }
      })();
    }
  }, [token, visibleImageRefs, imageUrls, imageErrors, loadingImageRefs]);

  useEffect(() => {
    const inFlight = imageFetchInFlightRef.current;
    return () => {
      const previous = Object.values(blobUrlsByRef.current);
      for (const url of previous) {
        URL.revokeObjectURL(url);
      }
      blobUrlsByRef.current = {};
      inFlight.clear();
    };
  }, []);

  return {
    state: {
      imageUrls,
      imageErrors,
      loadingImageRefs,
      visibleImageRefs,
    },
    refs: {
      imageFetchInFlightRef,
      blobUrlsByRef,
    },
    resetImages,
  };
}
