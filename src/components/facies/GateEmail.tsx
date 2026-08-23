"use client";

import { useState } from "react";
import { registrarInteresse, type ResultadoInteresse } from "@/lib/faciesFunnel";

/**
 * O gate DEPOIS do valor (§3.3), e nunca antes.
 *
 * O visitante já leu a fácies inteira quando chega aqui. Pedir e-mail antes de
 * entregar o que ele veio buscar é o erro que o posicionamento inteiro evita.
 *
 * Este componente existia como formulário decorativo — bonito e sem `action`.
 * Formulário que parece funcionar e não funciona é pior que não ter formulário:
 * a pessoa acha que se inscreveu, não recebe nada, e a primeira interação dela
 * com a marca vira uma promessa quebrada.
 */
export function GateEmail({ banca }: { banca: string | null }) {
  const [email, setEmail] = useState("");
  const [estado, setEstado] = useState<"pronto" | "enviando" | ResultadoInteresse>("pronto");

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    if (estado === "enviando") return;
    setEstado("enviando");
    setEstado(await registrarInteresse(email, banca));
  }

  if (estado === "ok") {
    return (
      <div className="rounded-surface border border-primary bg-surfaceMuted p-5 sm:p-6">
        <p className="text-base font-semibold text-ink">Pronto — está salvo.</p>
        <p className="mt-1 text-sm text-muted">
          Avisamos quando a fácies desta prova for atualizada. Nada entre isso.
        </p>
      </div>
    );
  }

  return (
    <section className="rounded-surface border border-edge bg-surfaceMuted p-5 sm:p-6">
      <p className="text-base text-ink">
        Salvar esta fácies — e saber quando a Fácies abrir.
      </p>
      {/* Os DOIS motivos, e os dois têm mecanismo: os gatilhos de leitura
          (edital, nova edição, mudança de padrão, base fechou) e o de abertura
          (assinatura_abriu), em app/services/facies_notice.py. Sem o quinto
          gatilho, a segunda metade desta frase seria promessa sem nada por trás
          — a mesma classe de afirmação que já saiu desta página duas vezes. */}
      <p className="mt-1 text-sm text-muted">
        Avisamos quando a leitura desta prova mudar, e quando o app abrir para
        assinatura. Nada entre isso — e para sair, um clique no link que vai em todo
        e-mail.
      </p>
      <form className="mt-4 flex flex-wrap gap-2" onSubmit={enviar} noValidate>
        <label className="sr-only" htmlFor="email-facies">
          Seu e-mail
        </label>
        <input
          id="email-facies"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          autoComplete="email"
          aria-describedby={estado === "invalido" ? "erro-email-facies" : undefined}
          className="paper-control min-w-[14rem] flex-1 rounded-control border border-edge bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={estado === "enviando"}
          className="paper-control rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-semibold text-primaryInk disabled:opacity-60"
        >
          {estado === "enviando" ? "Salvando…" : "Salvar"}
        </button>
      </form>

      {estado === "invalido" ? (
        <p id="erro-email-facies" className="mt-2 text-sm text-danger">
          Confira o endereço — parece faltar alguma coisa.
        </p>
      ) : null}
      {estado === "limitado" ? (
        <p className="mt-2 text-sm text-muted">
          Muitas tentativas deste endereço de rede. Tente de novo em alguns minutos.
        </p>
      ) : null}
      {estado === "erro" ? (
        <p className="mt-2 text-sm text-muted">
          Não consegui salvar agora. A fácies acima continua sua para ler e compartilhar.
        </p>
      ) : null}
    </section>
  );
}
