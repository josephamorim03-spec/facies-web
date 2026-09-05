"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";

/**
 * A folha que sobe de baixo no celular e entra pela direita no desktop.
 *
 * ## Por que isto existe
 *
 * O padrao ja estava escrito A MAO QUATRO VEZES antes deste arquivo: duas
 * dentro de `banco/sessao/[sessionId]/_components/FocusedQuestion.tsx` (a folha
 * de Preferencias e a de "Por que esta questao?") e duas em
 * `cronograma/_components/calendar/CalendarSections.tsx`. A classe era copiada
 * literalmente, e cada copia decidia sozinha o que fazer com foco e com `Esc`.
 *
 * O design system tinha `Dialog` (centrado) e `Drawer` (lateral, sem
 * `side="bottom"`) — nenhum dos dois e esta forma. E esta forma e a que o
 * telemovel conhece: a folha que sobe e a gramatica que o Instagram, o YouTube
 * e o iOS ensinaram, e e a unica que cabe no polegar.
 *
 * ## O que a versao a mao ja acertava, e fica
 *
 * Backdrop que fecha ao toque, `Esc`, e devolucao do foco ao gatilho. Estava
 * certo e continua.
 *
 * ## O que ela nao tinha, e agora tem
 *
 * **Retencao de foco.** As copias declaravam `aria-modal` sem prender o Tab —
 * o leitor de tela anunciava "dialogo" e o teclado passeava pela pagina atras
 * dela. Ou a folha prende o foco, ou nao e modal; afirmar o que nao se cumpre
 * e pior que nao afirmar.
 *
 * **Movimento.** `motion` v12 estava instalada e o app inteiro nao tinha um
 * unico `<motion.*>`. A folha que aparece sem vir de lugar nenhum e a que o
 * utilizador nao entende de onde veio.
 */

// O seletor do que recebe foco. `[tabindex="-1"]` fica de fora de proposito: e
// programaticamente focavel, mas nao entra na ordem do Tab.
const FOCAVEL =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * A duracao vem do TOKEN, e nao de um numero repetido aqui.
 *
 * `--motion-base` e 180ms hoje. Escrever `0.18` neste arquivo criaria duas
 * fontes de verdade para a mesma decisao, e a que ninguem revisita e sempre a
 * do JavaScript. O `padrao` so responde no servidor, onde nao ha folha para
 * animar.
 */
function segundosDoToken(nome: string, padrao: number): number {
  if (typeof window === "undefined") return padrao;
  const bruto = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
  if (bruto.endsWith("ms")) return Number.parseFloat(bruto) / 1000;
  if (bruto.endsWith("s")) return Number.parseFloat(bruto);
  return padrao;
}

/**
 * Espelha `--ease-cozy` em `globals.css`.
 *
 * `tests/unit/sheet-tokens.test.mjs` compara os dois e falha se divergirem — e
 * por isso que este par nao pode mentir em silencio.
 */
export const EASE_COZY = [0.32, 0.72, 0, 1] as const;

export type SheetProps = {
  open: boolean;
  onClose: () => void;
  /** Vira o `aria-labelledby` da folha, e o titulo visivel. */
  title: string;
  /** A linha pequena acima do titulo (`paper-eyebrow`). */
  eyebrow?: string;
  children: ReactNode;
  /** Classe extra no painel, para largura fora do padrao no desktop. */
  className?: string;
};

export function Sheet({ open, onClose, title, eyebrow, children, className }: SheetProps) {
  const painelRef = useRef<HTMLElement | null>(null);
  const gatilhoRef = useRef<HTMLElement | null>(null);
  const tituloId = useId();
  const semMovimento = useReducedMotion();
  // A folha sobe no celular e entra pela direita no desktop. `motion` nao
  // resolve media query sozinho, entao a largura e lida uma vez.
  const [amplo, setAmplo] = useState(false);

  useEffect(() => {
    const consulta = window.matchMedia("(min-width: 768px)");
    const aplicar = () => setAmplo(consulta.matches);
    aplicar();
    consulta.addEventListener("change", aplicar);
    return () => consulta.removeEventListener("change", aplicar);
  }, []);

  // Guarda quem abriu ANTES de mover o foco, e devolve ao fechar. Sem isto, o
  // teclado volta ao topo da pagina e quem navega assim perde o lugar.
  useEffect(() => {
    if (!open) return;
    gatilhoRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    // O painel, e nao o primeiro botao: o leitor de tela le o titulo antes de
    // anunciar um controle, que e a ordem em que a pessoa quer ouvir.
    const foco = window.setTimeout(() => painelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(foco);
      const gatilho = gatilhoRef.current;
      gatilhoRef.current = null;
      // Fora do frame: no mesmo tick o painel ainda esta no DOM em saida, e o
      // foco voltaria para ele.
      window.setTimeout(() => gatilho?.focus(), 0);
    };
  }, [open]);

  const aoTeclar = useCallback(
    (evento: React.KeyboardEvent<HTMLElement>) => {
      if (evento.key === "Escape") {
        evento.stopPropagation();
        onClose();
        return;
      }
      if (evento.key !== "Tab") return;
      const painel = painelRef.current;
      if (!painel) return;
      const alvos = Array.from(painel.querySelectorAll<HTMLElement>(FOCAVEL));
      if (alvos.length === 0) {
        // Folha sem nenhum controle: o Tab nao tem para onde ir dentro dela, e
        // deixa-lo sair seria perder o modal.
        evento.preventDefault();
        return;
      }
      const primeiro = alvos[0];
      const ultimo = alvos[alvos.length - 1];
      const ativo = document.activeElement;
      if (evento.shiftKey && (ativo === primeiro || ativo === painel)) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && ativo === ultimo) {
        evento.preventDefault();
        primeiro.focus();
      }
    },
    [onClose],
  );

  const duracao = segundosDoToken("--motion-base", 0.18);
  const desloca = semMovimento ? {} : amplo ? { x: "100%" } : { y: "100%" };

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/20"
            onClick={onClose}
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: duracao, ease: EASE_COZY }}
          />
          <motion.aside
            ref={painelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={tituloId}
            tabIndex={-1}
            onKeyDown={aoTeclar}
            initial={{ opacity: 0, ...desloca }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, ...desloca }}
            transition={{ duration: duracao, ease: EASE_COZY }}
            className={[
              // ⚠️ z-50, ACIMA DA BARRA DE ABAS.
              //
              // O painel era z-40 e a `MobileTabBar` tambem e' z-40 -- mesma
              // camada, e a barra vem DEPOIS no DOM, entao ela ganhava. O
              // resultado nao era visual: o botao primario da folha ficava
              // debaixo da barra e NAO RECEBIA O TOQUE. Apanhado pelo e2e do
              // mapa, que reportou "<path d=M12 6v14> from <div class=fixed
              // inset-x-0 bottom-0 z-40> intercepts pointer events".
              //
              // Uma folha modal tem de cobrir a navegacao: enquanto ela esta
              // aberta, a navegacao nao e' a tarefa. O backdrop sobe junto,
              // senao ele ficaria ABAIXO da barra e o toque fora da folha
              // acertaria uma aba em vez de fechar.
              "fixed bottom-0 right-0 z-50 max-h-[86svh] w-full overflow-y-auto",
              "border-t border-edge bg-paper p-4 shadow-overlay outline-none",
              "md:bottom-0 md:top-0 md:max-h-none md:max-w-md md:border-l md:border-t-0",
              className ?? "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {eyebrow ? <p className="paper-eyebrow">{eyebrow}</p> : null}
                <h2 id={tituloId} className="mt-1 font-serif text-xl font-semibold text-ink">
                  {title}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="paper-control border border-edge px-2 py-1 text-xs text-muted hover:text-ink"
              >
                Fechar
              </button>
            </div>
            <div className="mt-4">{children}</div>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}
