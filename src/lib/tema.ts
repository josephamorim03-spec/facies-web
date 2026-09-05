import { THEME_KEY } from "@/lib/storage-keys";

/**
 * O tema, com as TRÊS respostas possíveis.
 *
 * ## Por que três, e não um interruptor
 *
 * O modelo guardado sempre teve três estados — `"dark"`, `"light"` e a ausência
 * da chave, que significa "siga o sistema". Mas o único controle era um
 * interruptor de dois: uma vez tocado, a chave passava a existir e **não havia
 * caminho de volta** para o sistema. Quem trocasse por engano ficava preso ao
 * valor fixo até limpar os dados do navegador.
 *
 * ## Uma fonte, três leitores
 *
 * A regra vivia copiada em três lugares — o script de boot em `layout.tsx`, o
 * `ThemeProvider` e o `ThemeToggle` —, e o comentário do `layout.tsx` registra
 * que a primeira versão saiu errada justamente por divergirem. Aqui a regra é
 * uma; o script de boot continua separado por necessidade (roda antes do
 * bundle) e o `layout.tsx` o deriva desta mesma constante.
 */
export type Tema = "claro" | "escuro" | "sistema";

/** O que vai para o `localStorage`. `sistema` é a AUSÊNCIA da chave. */
const GRAVADO = { claro: "light", escuro: "dark" } as const;

export const CONSULTA_ESCURO = "(prefers-color-scheme: dark)";

export function lerTema(): Tema {
  try {
    const guardado = localStorage.getItem(THEME_KEY);
    if (guardado === "dark") return "escuro";
    if (guardado === "light") return "claro";
  } catch {
    // Janela anônima, cookies bloqueados: cai no sistema, que é o padrão.
  }
  return "sistema";
}

/** O que a tela realmente mostra — `sistema` resolve pela preferência do SO. */
export function temaEfetivo(tema: Tema): "claro" | "escuro" {
  if (tema !== "sistema") return tema;
  try {
    return window.matchMedia(CONSULTA_ESCURO).matches ? "escuro" : "claro";
  } catch {
    return "claro";
  }
}

/** Aplica na árvore e persiste. `sistema` REMOVE a chave, não grava "system". */
export function aplicarTema(tema: Tema): void {
  const escuro = temaEfetivo(tema) === "escuro";
  document.documentElement.classList.toggle("dark", escuro);
  try {
    if (tema === "sistema") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, GRAVADO[tema]);
  } catch {
    // Sem persistência a escolha vale para esta sessão. É melhor que recusar.
  }
  notificarTema();
}

/** A ordem do ciclo do botão de ícone: claro → escuro → sistema → claro. */
export const CICLO: Record<Tema, Tema> = {
  claro: "escuro",
  escuro: "sistema",
  sistema: "claro",
};

export const ROTULO: Record<Tema, string> = {
  claro: "Claro",
  escuro: "Escuro",
  sistema: "Sistema",
};

// ── A LOJA ────────────────────────────────────────────────────────────────
//
// O tema é estado EXTERNO ao React: mora no `localStorage` e numa classe do
// `<html>`. Dois componentes o mostram ao mesmo tempo — o ícone da barra
// lateral e o seletor de `/voce` — e trocar num deles tem de mudar o outro.
//
// Ler com `useState` + `useEffect` fazia as duas coisas erradas: dava um render
// a mais em cada montagem (o lint do React reprova, com razão) e deixava as
// duas cópias divergirem, porque nenhuma sabia da outra. Uma lista de ouvintes
// mínima resolve as duas de uma vez, e é o que `useSyncExternalStore` espera do
// outro lado.

const ouvintes = new Set<() => void>();

export function assinarTema(aoMudar: () => void): () => void {
  ouvintes.add(aoMudar);
  return () => {
    ouvintes.delete(aoMudar);
  };
}

export function notificarTema(): void {
  for (const ouvinte of ouvintes) ouvinte();
}
