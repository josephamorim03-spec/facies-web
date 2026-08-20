// Saída discreta e consistente do Modo Questão (treino e simulado). O chrome do
// app é ocultado no runner imersivo; esta é a forma de voltar. A lógica (sair
// direto no treino, confirmar no simulado) vive na página da sessão.
export function SessionExitButton({
  onExit,
  className = "",
}: {
  onExit: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onExit}
      aria-label="Sair da sessão"
      className={`inline-flex shrink-0 items-center gap-1 rounded-surface border border-edge bg-paper/80 px-2 py-1.5 text-xs font-semibold text-muted transition hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5" aria-hidden>
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Sair
    </button>
  );
}
