"use client";

type Props = {
  showSettings: boolean;
  avg12h: string;
  avg24h: string;
  showHelp: boolean;
  showRetentionHelp: boolean;
  retention: string;
  hasCustomParams: boolean;
  onAvg12hChange: (v: string) => void;
  onAvg24hChange: (v: string) => void;
  onShowHelpChange: (v: boolean) => void;
  onShowRetentionHelpChange: (v: boolean) => void;
  onRetentionChange: (v: string) => void;
  onSaveTolerance: () => void;
  onResetFsrsParams: () => void;
  onClose: () => void;
};

export function SettingsPanel({
  showSettings,
  avg12h,
  avg24h,
  showHelp,
  showRetentionHelp,
  retention,
  hasCustomParams,
  onAvg12hChange,
  onAvg24hChange,
  onShowHelpChange,
  onShowRetentionHelpChange,
  onRetentionChange,
  onSaveTolerance,
  onResetFsrsParams,
  onClose,
}: Props) {
  if (!showSettings) return null;

  return (
    <div className="rounded-xl border border-edge p-3 space-y-3 mb-4">
      <div className="flex items-center gap-2">
        <p className="text-xs text-muted uppercase tracking-wide">Capacidade por turno</p>
        <div className="relative">
          <button
            type="button"
            className="w-4 h-4 rounded-full border border-edge text-muted text-[10px] leading-none flex items-center justify-center hover:border-ink"
            onMouseEnter={() => onShowHelpChange(true)}
            onMouseLeave={() => onShowHelpChange(false)}
            onClick={() => onShowHelpChange(!showHelp)}
          >?</button>
          {showHelp && (
            <div className="absolute left-5 top-0 z-30 w-64 rounded-xl bg-paper border border-edge p-2 text-xs text-muted shadow-sm">
              Informe quantas questões em média você estima fazer durante trabalho/plantão de 12h. O sistema vai usar isso como base para calcular quanto você tolera fazer de questões nos demais compromissos
            </div>
          )}
        </div>
      </div>
      <label className="text-xs text-muted flex items-center gap-2">
        Trabalho 12h
        <input type="text" inputMode="numeric" value={avg12h}
          onChange={(e) => onAvg12hChange(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="—"
          className="rounded-xl border border-edge w-14 px-1 py-0.5 text-sm bg-paper text-center" />
        <span className="text-muted">q</span>
      </label>
      <label className="text-xs text-muted flex items-center gap-2">
        Plantão 24h — questões em média
        <input type="text" inputMode="numeric" value={avg24h}
          onChange={(e) => onAvg24hChange(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="—"
          className="rounded-xl border border-edge w-14 px-1 py-0.5 text-sm bg-paper text-center" />
        <span className="text-muted">q</span>
      </label>
      <hr className="border-edge" />
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <p className="text-xs text-muted uppercase tracking-wide">Meta de acertos</p>
          <div className="relative">
            <button
              type="button"
              className="w-4 h-4 rounded-full border border-edge text-muted text-[10px] leading-none flex items-center justify-center hover:border-ink"
              onMouseEnter={() => onShowRetentionHelpChange(true)}
              onMouseLeave={() => onShowRetentionHelpChange(false)}
              onClick={() => onShowRetentionHelpChange(!showRetentionHelp)}
            >?</button>
            {showRetentionHelp && (
              <div className="absolute left-5 top-0 z-30 w-64 rounded-xl bg-paper border border-edge p-2 text-xs text-muted shadow-sm">
                Define o quanto você quer lembrar do que estudou. 90% significa que o sistema vai espaçar as revisões para você manter 9 de cada 10 tópicos frescos na memória. Quanto menor, mais espaçadas as revisões.
              </div>
            )}
          </div>
        </div>
        <label className="text-xs text-muted flex items-center gap-2">
          Taxa de acertos que deseja manter (70–99)
          <input
            type="text"
            inputMode="numeric"
            value={retention}
            onChange={(e) => onRetentionChange(e.target.value.replace(/[^0-9]/g, ""))}
            className="rounded-xl border border-edge w-14 px-1 py-0.5 text-sm bg-paper text-center"
          />
          <span className="text-muted">%</span>
        </label>
        {hasCustomParams && (
          <button
            type="button"
            onClick={onResetFsrsParams}
            className="text-xs rounded-xl text-muted border border-edge px-2 py-0.5 hover:border-primary"
          >
            Redefinir calibração personalizada
          </button>
        )}
      </div>
      <div className="flex gap-2">
        <button onClick={onSaveTolerance} className="text-xs rounded-xl border border-ink px-3 py-1 hover:bg-ink hover:text-paper transition-colors">Salvar</button>
        <button onClick={onClose} className="text-xs text-muted px-3 py-1">Cancelar</button>
      </div>
    </div>
  );
}
