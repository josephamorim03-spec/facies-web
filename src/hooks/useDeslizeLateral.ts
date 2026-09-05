"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Deslizar para a esquerda e para a direita, por cima dos botoes.
 *
 * ## A regra que este arquivo obedece
 *
 * O desenho decidiu isto, e decidiu contra o gesto como espinha dorsal
 * (`Webapp - telas.dc.html:2181`):
 *
 * > "Como se anda entre as questoes: **por botao, nao por gesto** [...] O
 * > deslizar existe por cima disso, como atalho para quem ja sabe, **nunca como
 * > unico caminho**: gesto nao tem foco de teclado, nao e lido por leitor de
 * > tela, nao aparece para quem nunca usou e some para quem usa uma mao so na
 * > maca. **Toda acao de gesto tem um botao equivalente na tela.**"
 *
 * E a WCAG 2.5.1 (Pointer Gestures, nivel A) pede exatamente a mesma coisa por
 * outro caminho: gesto de PERCURSO precisa de alternativa de ponteiro unico.
 *
 * Por isso este hook nao expoe nenhum caminho proprio: ele so chama de volta
 * `aoAvancar`/`aoVoltar`, que sao as MESMAS funcoes dos botoes. Quem o usa nao
 * consegue, nem por engano, criar um caminho que so exista no dedo.
 *
 * ## SO horizontal, e isso nao e preguica
 *
 * O `useTurboCardState` desliza tambem na vertical, para revelar a resposta —
 * mas o cartao dele ocupa a tela inteira e NAO rola. O enunciado clinico rola,
 * e sequestrar a vertical numa tela de leitura tira do aluno a unica coisa que
 * ele faz o tempo todo. O aprofundamento (revelar, por que, armadilha)
 * continua em botao aqui, e vira gesto onde o cartao nao rola.
 *
 * Por isso `touch-action: pan-y` (ver `ESTILO_DO_DESLIZE`): o navegador fica
 * com a vertical, e nos ficamos com a horizontal. Roubar as duas com
 * `touch-action: none` quebraria a rolagem da pagina.
 *
 * ## ⚠️ A supressao de borda NAO esta ligada na sessao
 *
 * `useEdgeSwipeSuppression` e montado em `Nav.tsx:70` com `!hideCompletely` — e
 * a sessao esconde o chrome, entao la ele esta DESLIGADO. Sem ele, o swipe de
 * borda do iOS/Android navega o historico no meio do gesto e o aluno perde a
 * sessao. Quem usa este hook numa tela sem chrome monta a supressao tambem.
 */

// Os limiares vem do gesto que ja existe e ja foi calibrado a dedo em
// `cards/registros/_components/_hooks/useTurboCardState.ts`. Numeros diferentes
// para o mesmo gesto em duas telas do mesmo app seria o defeito.
const LIMIAR_DE_EIXO = 12;
const MARGEM_DO_EIXO = 6;
const LIMIAR_DE_DISPARO = 60;
/** Quanto o cartao cede quando nao ha para onde ir. E a resposta que diz "acabou". */
const RESISTENCIA = 24;

export type DeslizeLateralOpcoes = {
  /** A preferencia do artboard `8f`. Falso desmonta o gesto por completo. */
  ativo: boolean;
  podeAvancar: boolean;
  podeVoltar: boolean;
  aoAvancar: () => void;
  aoVoltar: () => void;
};

export type DeslizeLateralEstado = {
  /** Deslocamento em px, para o feedback visual. Zero quando parado. */
  deslocamento: number;
  arrastando: boolean;
};

/**
 * Estilo do contentor que recebe o gesto.
 *
 * `pan-y` deixa a rolagem vertical com o navegador. `data-allow-horizontal-swipe`
 * e o contrato que `useEdgeSwipeSuppression` le para nao cancelar o toque.
 */
export const ESTILO_DO_DESLIZE = {
  touchAction: "pan-y" as const,
};

export function useDeslizeLateral({
  ativo,
  podeAvancar,
  podeVoltar,
  aoAvancar,
  aoVoltar,
}: DeslizeLateralOpcoes): [DeslizeLateralEstado, React.DOMAttributes<HTMLElement>] {
  const [deslocamento, setDeslocamento] = useState(0);
  const [arrastando, setArrastando] = useState(false);
  const inicioX = useRef(0);
  const inicioY = useRef(0);
  const eixo = useRef<"x" | "y" | null>(null);
  const atual = useRef(0);
  const ativoRef = useRef(false);

  const encerrarGesto = useCallback(() => {
    ativoRef.current = false;
    eixo.current = null;
    atual.current = 0;
    setArrastando(false);
    setDeslocamento(0);
  }, []);

  const aoPressionar = useCallback(
    (evento: React.PointerEvent<HTMLElement>) => {
      if (!ativo) return;
      // Um dedo so: dois dedos e pinca de zoom, e o medico usa zoom no enunciado.
      if (!evento.isPrimary) return;
      // O gesto do rato nao existe: no desktop ha teclado e botao, e arrastar
      // com o ponteiro por engano sobre um texto selecionavel seria hostil.
      if (evento.pointerType === "mouse") return;
      if (ehAlvoInterativo(evento.target)) return;
      if (!podeAvancar && !podeVoltar) return;
      ativoRef.current = true;
      inicioX.current = evento.clientX;
      inicioY.current = evento.clientY;
      eixo.current = null;
      atual.current = 0;
      setArrastando(true);
    },
    [ativo, podeAvancar, podeVoltar],
  );

  const aoMover = useCallback(
    (evento: React.PointerEvent<HTMLElement>) => {
      if (!ativoRef.current) return;
      const dx = evento.clientX - inicioX.current;
      const dy = evento.clientY - inicioY.current;

      // A TRAVA DE EIXO decide uma vez e nao volta atras. Sem ela, o dedo que
      // rola a pagina na diagonal arrasta a questao de lado ao mesmo tempo.
      if (!eixo.current) {
        if (Math.abs(dy) > LIMIAR_DE_EIXO && Math.abs(dy) > Math.abs(dx) + MARGEM_DO_EIXO) {
          eixo.current = "y";
        } else if (Math.abs(dx) > LIMIAR_DE_EIXO) {
          eixo.current = "x";
        } else {
          return;
        }
      }

      if (eixo.current === "y") {
        // A vertical e do navegador. Solta o gesto e deixa a pagina rolar.
        if (atual.current !== 0) setDeslocamento(0);
        atual.current = 0;
        ativoRef.current = false;
        setArrastando(false);
        return;
      }

      let proximo = dx;
      if (proximo < 0 && !podeAvancar) proximo = Math.max(proximo, -RESISTENCIA);
      if (proximo > 0 && !podeVoltar) proximo = Math.min(proximo, RESISTENCIA);
      atual.current = proximo;
      setDeslocamento(proximo);
    },
    [podeAvancar, podeVoltar],
  );

  const aoLargar = useCallback(() => {
    if (!ativoRef.current) return;
    const final = atual.current;
    encerrarGesto();
    if (final <= -LIMIAR_DE_DISPARO && podeAvancar) {
      aoAvancar();
      return;
    }
    if (final >= LIMIAR_DE_DISPARO && podeVoltar) {
      aoVoltar();
    }
  }, [aoAvancar, aoVoltar, encerrarGesto, podeAvancar, podeVoltar]);

  if (!ativo) {
    return [{ deslocamento: 0, arrastando: false }, {}];
  }

  return [
    { deslocamento, arrastando },
    {
      onPointerDown: aoPressionar,
      onPointerMove: aoMover,
      onPointerUp: aoLargar,
      // O toque que sai da tela ou e cancelado pelo sistema tem de voltar ao
      // repouso; senao a questao fica torta ate o proximo gesto.
      onPointerCancel: encerrarGesto,
      onPointerLeave: encerrarGesto,
    },
  ];
}

/**
 * O que NAO recebe o gesto: tudo que ja tem uma acao propria ao toque.
 *
 * A mesma lista de `useTurboCardState.ts`. `img` esta la porque a imagem da
 * questao abre em tamanho grande, e o gesto sobre ela roubaria o toque.
 */
function ehAlvoInterativo(alvo: EventTarget | null): boolean {
  if (!(alvo instanceof Element)) return false;
  return Boolean(
    alvo.closest(
      "button, a, input, textarea, select, [role='button'], [contenteditable='true'], img, [data-sem-deslize='true']",
    ),
  );
}
