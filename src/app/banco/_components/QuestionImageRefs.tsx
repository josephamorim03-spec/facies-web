/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";

type QuestionImageRefsProps = {
  imageRefs: string[];
  alt?: string;
  className?: string;
  imageClassName?: string;
  placeholderClassName?: string;
};

export function QuestionImageRefs({
  imageRefs,
  alt = "Imagem da questão",
  className = "grid gap-3 md:grid-cols-2",
  imageClassName = "border border-edge bg-surface",
  placeholderClassName = "paper-dashed flex min-h-32 items-center justify-center bg-surface px-4 py-6 text-center text-sm font-medium text-muted",
}: QuestionImageRefsProps) {
  const [failedImages, setFailedImages] = useState<Set<string>>(() => new Set());
  const refs = imageRefs.filter((src) => src.trim().length > 0);

  if (refs.length === 0) return null;

  function markFailed(src: string) {
    setFailedImages((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }

  return (
    <div className={className}>
      {refs.map((src) => (
        failedImages.has(src) ? (
          <div key={src} className={placeholderClassName} role="img" aria-label="Imagem indisponivel">
            Imagem indisponível
          </div>
        ) : (
          <img
            key={src}
            src={src}
            alt={alt}
            loading="lazy"
            decoding="async"
            className={imageClassName}
            onError={() => markFailed(src)}
          />
        )
      ))}
    </div>
  );
}
