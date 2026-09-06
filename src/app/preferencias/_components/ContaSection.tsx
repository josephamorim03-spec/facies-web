"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut as LogOut, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useSessionNavGuard } from "@/hooks/useSessionNavGuard";

/**
 * Conta e aparencia.
 *
 * Sair da conta e o seletor de tema viviam SO dentro do drawer mobile e da
 * `SidebarNav`. Como `SidebarNav` renderiza `null` sem desktop, aposentar o
 * drawer teria deixado quem usa celular sem nenhuma das duas coisas — o aluno
 * ficaria preso na conta. Aqui e o lugar certo dos dois de qualquer forma:
 * Preferencias e o destino de "voce e seus ajustes".
 */
export function ContaSection() {
  const pathname = usePathname() ?? "";
  const { logoutConfirmOpen, requestLogout, cancelLogout, confirmLogout } = useSessionNavGuard({ pathname });

  return (
    <section className="paper-surface p-4 sm:p-5" aria-labelledby="conta-heading">
      <h2 id="conta-heading" className="paper-eyebrow">
        Conta e aparência
      </h2>

      {/* Empilha no celular: o botao ficou mais largo com maiuscula, tracking e
          os colchetes do chrome, e lado a lado com o seletor de tema ele
          estourava a viewport de 390px em 15px. */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">Tema</span>
          <ThemeToggle />
        </div>

        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={requestLogout}
          leftIcon={<LogOut className="h-4 w-4" aria-hidden="true" />}
          className="w-full sm:w-auto"
        >
          Sair da conta
        </Button>
      </div>

      {/* A porta para `/conta`: sessões ativas, exportar os dados e excluir a
          conta. Os dois últimos são direitos de LGPD cujo backend existia e
          nunca teve tela — só se alcançavam por `curl`. */}
      <div className="mt-4 border-t border-rule pt-4">
        <Link
          href="/conta"
          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
        >
          <ShieldCheck className="h-4 w-4" aria-hidden="true" />
          Conta e privacidade
        </Link>
        <p className="mt-1 text-xs leading-5 text-muted">
          Sessões ativas, exportar seus dados e excluir a conta.
        </p>
      </div>

      <ConfirmDialog
        open={logoutConfirmOpen}
        title="Sair da conta?"
        message="Encerrar a sessão neste dispositivo?"
        cancelLabel="Cancelar"
        confirmLabel="Sair"
        onCancel={cancelLogout}
        onConfirm={confirmLogout}
      />
    </section>
  );
}
