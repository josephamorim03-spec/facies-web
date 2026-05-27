type ExitSessionDialogProps = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ExitSessionDialog(props: ExitSessionDialogProps) {
  const { open, onCancel, onConfirm } = props;
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-[60] flex items-center justify-center p-4">
      <div role="dialog" aria-label="Confirmar saída da sessão" className="bg-paper border border-edge w-full max-w-md p-4 space-y-4">
        <p className="text-sm">
          Deseja sair da sessão? A atividade será perdida
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs border border-edge px-3 py-1.5"
          >
            Continuar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="text-xs border border-red-600 text-red-600 px-3 py-1.5 hover:bg-red-50"
          >
            Sair da sessão
          </button>
        </div>
      </div>
    </div>
  );
}
