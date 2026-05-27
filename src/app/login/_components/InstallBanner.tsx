"use client";

import React from "react";
import Image from "next/image";

export type InstallBannerProps = {
  installState: string;
  showIosTooltip: boolean;
  onInstall: () => Promise<void>;
  onCloseTooltip: () => void;
};

export function InstallBanner({
  installState,
  showIosTooltip,
  onInstall,
  onCloseTooltip,
}: InstallBannerProps) {
  if (installState === "hidden") return null;

  return (
    <div className="md:hidden fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] z-40 flex flex-col items-center px-4 pointer-events-none">
      <button
        type="button"
        className="pointer-events-auto flex items-center gap-2 rounded-xl border border-edge bg-paper/95 px-3 py-2 shadow-sm backdrop-blur-[2px]"
        onClick={onInstall}
        aria-label="Instale para melhor experiência"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" />
        </svg>
        <Image src="/apple-touch-icon.png" alt="KrosMed" width={24} height={24} className="w-6 h-6 rounded-md" />
        <span className="text-xs text-muted whitespace-nowrap">Instale para melhor experiência</span>
      </button>

      {showIosTooltip && (
        <div className="pointer-events-auto mt-2 w-full max-w-sm bg-ink text-paper text-sm rounded p-3 flex items-start gap-2">
          <span className="leading-snug">
            {installState === "ios_chrome" ? (
              <>
                No Chrome no iPhone/iPad, abra o compartilhar ao lado do link e escolha{" "}
                <strong>&ldquo;Adicionar a Tela de Início&rdquo;</strong>.
              </>
            ) : (
              <>
                No menu do navegador, escolha compartilhar e depois{" "}
                <strong>&ldquo;Adicionar a Tela de Início&rdquo;</strong>.
              </>
            )}
          </span>
          <button
            type="button"
            className="ml-auto shrink-0 text-paper/60 hover:text-paper"
            onClick={onCloseTooltip}
            aria-label="Fechar"
          >
            &times;
          </button>
        </div>
      )}
    </div>
  );
}
