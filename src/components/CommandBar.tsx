"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { NAV_ITEMS, getIntentChildren } from "@/lib/navConfig";

type Destino = { href: string; label: string; hint?: string };

/**
 * Prompt de comando — ACELERADOR, nunca caminho único.
 *
 * A regra que decide o desenho: a barra inferior e o menu continuam sempre
 * visíveis e clicáveis. Um app em que o atalho é a única porta exige decorar
 * comandos, e o aluno abre isto às seis da manhã antes do plantão.
 *
 * Por isso ele NÃO tem comandos próprios. Ele navega para os mesmos destinos do
 * menu, lidos de `navConfig` — se um destino não está no menu, não está aqui, e
 * as duas superfícies não podem divergir.
 *
 * Mobile fica de fora (`md:` no listener de teclado não existiria de qualquer
 * forma — não há Ctrl+K sem teclado), e por isso a barra inferior segue sendo a
 * navegação de verdade.
 */
export function CommandBar() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const destinos = useMemo<Destino[]>(() => {
    const out: Destino[] = [];
    for (const item of NAV_ITEMS) {
      out.push({ href: item.href, label: item.shortLabel });
      for (const child of getIntentChildren(item.href)) {
        // O filho carrega o nome do pai: "Cronograma" sozinho não diz de onde
        // vem, e a lista mistura os cinco grupos.
        out.push({ href: child.href, label: child.label, hint: item.shortLabel });
      }
    }
    // Um destino pode aparecer como aba e como filho (o pai abre no primeiro
    // filho); a primeira ocorrência vence.
    return out.filter(
      (item, index) => out.findIndex((other) => other.href === item.href) === index,
    );
  }, []);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return destinos;
    return destinos.filter((item) =>
      `${item.label} ${item.hint ?? ""}`.toLowerCase().includes(needle),
    );
  }, [destinos, query]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
        setQuery("");
        setCursor(0);
      }
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  if (!open) return null;

  function go(href: string) {
    setOpen(false);
    router.push(href);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ir para"
      className="fixed inset-0 z-[90] hidden items-start justify-center bg-paper/80 pt-[12vh] md:flex"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-[min(34rem,calc(100vw-3rem))] border border-edge bg-surface shadow-[var(--overlay-shadow)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-edge px-3 py-2">
          {/* O prompt é decoração: conteúdo gerado não entra no nome acessível,
              então o leitor de tela anuncia o rótulo do campo, não "C dois
              pontos barra invertida KROS maior que". */}
          <span aria-hidden="true" className="text-xs font-semibold text-primary">
            {"C:\\KROS>"}
          </span>
          <input
            ref={inputRef}
            value={query}
            aria-label="Ir para"
            placeholder="ir para..."
            onChange={(event) => {
              setQuery(event.target.value);
              setCursor(0);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setCursor((n) => Math.min(n + 1, results.length - 1));
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setCursor((n) => Math.max(n - 1, 0));
              }
              if (event.key === "Enter" && results[cursor]) go(results[cursor].href);
            }}
            className="min-h-10 flex-1 border-0 bg-transparent px-0 text-sm text-ink outline-none"
          />
        </div>

        <ul className="max-h-72 overflow-y-auto">
          {results.map((item, index) => (
            <li key={item.href}>
              <button
                type="button"
                onClick={() => go(item.href)}
                onMouseEnter={() => setCursor(index)}
                aria-current={index === cursor ? "true" : undefined}
                className={`flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm ${
                  index === cursor ? "bg-primary text-primaryInk" : "text-ink hover:bg-surfaceMuted"
                }`}
              >
                <span className="uppercase tracking-[0.08em]">{item.label}</span>
                {item.hint ? (
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                      index === cursor ? "opacity-70" : "text-muted"
                    }`}
                  >
                    {item.hint}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
          {results.length === 0 ? (
            <li className="px-3 py-4 text-sm text-muted">Nenhum destino com esse nome.</li>
          ) : null}
        </ul>

        <div className="chrome-statusbar">
          <span>↑↓ navegar</span>
          <span>Enter abrir</span>
          <span>Esc fechar</span>
        </div>
      </div>
    </div>
  );
}
