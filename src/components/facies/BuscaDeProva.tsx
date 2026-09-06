"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { bancasComPagina, nomeCurto, todasAsBancas } from "@/lib/facies";

/**
 * A busca do herói — a `.busca` da v7, e o controle que faltava na página.
 *
 * ## Por que ela precisa existir, e o cartão não a substitui
 *
 * `FaciesPicker` mostra quatro provas em destaque como CARTÕES, cada um com a
 * sua faixa de áreas — e a razão está escrita lá: a página afirma que cada prova
 * tem cara própria, e o cartão faz essa afirmação acontecer no primeiro olhar.
 * Isso continua valendo.
 *
 * O que ele não faz é **achar a sua**. O acervo tem 141 bancas e a fileira cabe
 * quatro. Quem presta a quinta chegava à home, lia que existe uma leitura da
 * prova dele, e não tinha como pedi-la — o índice completo só aparecia num link
 * de rodapé do seletor. É a falha mais cara possível numa página cuja tese é
 * "a SUA prova".
 *
 * ## O campo é uma RÉGUA, não uma caixa
 *
 * Regra do handoff §3: *"Campo de busca. Régua de 2px sob o campo, não caixa."*
 * A caixa é o vocabulário de formulário — diz "preencha isto para prosseguir".
 * A régua é o de documento: uma linha onde se escreve. Numa página que imita
 * prontuário, a diferença decide se o herói lê como cadastro ou como consulta.
 *
 * ## A lista é navegável por teclado, e isso não é opcional
 *
 * `role="combobox"` sem `aria-activedescendant` é pior que nenhum: anuncia uma
 * lista que o leitor de tela não consegue percorrer. Setas movem, Enter abre,
 * Esc fecha, e o item ativo carrega `aria-selected`.
 */

/** Quantas sugestões cabem antes de a lista virar um segundo problema. */
const MAX_SUGESTOES = 8;

function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function BuscaDeProva() {
  const router = useRouter();
  const listaId = useId();
  const campoId = useId();
  const [termo, setTermo] = useState("");
  const [aberta, setAberta] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const campoRef = useRef<HTMLInputElement>(null);

  // O índice é montado UMA vez: 141 bancas, e normalizar acento a cada tecla
  // digitada refaria 141 `normalize()` por caractere.
  const indice = useMemo(
    () =>
      // `bancasComPagina` e não `todasAsBancas`: sugerir uma banca sem slug
      // fixado abriria `/prova/undefined`. Quem não tem endereço não entra na
      // busca.
      bancasComPagina().map(({ banca, slug }) => ({
        slug,
        curto: nomeCurto(banca),
        nome: banca.nome,
        uf: banca.uf,
        questoes: banca.questoes_total,
        // O NOME CURTO ENTRA NO ÍNDICE DE BUSCA, e a falta dele era um buraco
        // real: quem digita "usp-sp" ou "unicamp" batia contra o rótulo do
        // edital, onde "Unicamp" só aparece dentro de "Universidade Estadual de
        // Campinas". Agora o texto que a lista EXIBE também é o texto que ela
        // procura.
        busca: normalizar(`${nomeCurto(banca)} ${banca.nome} ${banca.uf ?? ""}`),
      })),
    [],
  );

  const sugestoes = useMemo(() => {
    const alvo = normalizar(termo.trim());
    if (alvo.length < 2) return [];
    // Quem começa com o termo vem primeiro: digitando "us", a USP interessa
    // mais que uma banca cujo nome contém "us" no meio.
    const casam = indice.filter((item) => item.busca.includes(alvo));
    casam.sort((a, b) => {
      const aComeca = a.busca.startsWith(alvo) ? 0 : 1;
      const bComeca = b.busca.startsWith(alvo) ? 0 : 1;
      if (aComeca !== bComeca) return aComeca - bComeca;
      return b.questoes - a.questoes;
    });
    return casam.slice(0, MAX_SUGESTOES);
  }, [indice, termo]);

  function abrir(slug: string) {
    router.push(`/prova/${slug}`);
  }

  function aoTeclar(evento: React.KeyboardEvent<HTMLInputElement>) {
    if (evento.key === "Escape") {
      setAberta(false);
      return;
    }
    if (sugestoes.length === 0) return;
    if (evento.key === "ArrowDown") {
      evento.preventDefault();
      setAberta(true);
      setAtivo((atual) => (atual + 1) % sugestoes.length);
    } else if (evento.key === "ArrowUp") {
      evento.preventDefault();
      setAberta(true);
      setAtivo((atual) => (atual - 1 + sugestoes.length) % sugestoes.length);
    } else if (evento.key === "Enter") {
      evento.preventDefault();
      abrir(sugestoes[Math.min(ativo, sugestoes.length - 1)].slug);
    }
  }

  const listaVisivel = aberta && sugestoes.length > 0;
  const itemAtivoId = listaVisivel ? `${listaId}-${Math.min(ativo, sugestoes.length - 1)}` : undefined;

  return (
    <div id="busca" className="relative mt-6 max-w-[620px] scroll-mt-6">
      <label htmlFor={campoId} className="paper-eyebrow">
        Qual prova você vai fazer?
      </label>

      {/* A RÉGUA. `border-b` de 2px e nada mais — sem fundo, sem caixa, sem
          raio. O foco escurece a linha em vez de desenhar um anel por fora:
          num campo sem caixa, o anel flutuaria em volta do nada. */}
      <input
        id={campoId}
        ref={campoRef}
        type="text"
        role="combobox"
        aria-expanded={listaVisivel}
        aria-controls={listaId}
        aria-autocomplete="list"
        aria-activedescendant={itemAtivoId}
        autoComplete="off"
        placeholder="ENAMED, USP, UNIFESP…"
        value={termo}
        onChange={(evento) => {
          setTermo(evento.target.value);
          setAtivo(0);
          setAberta(true);
        }}
        onFocus={() => setAberta(true)}
        // `blur` com atraso: o clique numa sugestão dispara o blur ANTES do
        // click, e sem a folga a lista fecharia debaixo do dedo.
        onBlur={() => window.setTimeout(() => setAberta(false), 120)}
        onKeyDown={aoTeclar}
        className="mt-2 w-full border-0 border-b-2 border-edge bg-transparent px-0 py-2 text-xl text-ink outline-none placeholder:text-muted focus-visible:border-primary focus-visible:outline-none sm:text-[26px]"
      />

      {listaVisivel ? (
        <ul
          id={listaId}
          role="listbox"
          aria-label="Provas"
          className="paper-overlay absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-surface border border-edge bg-surface"
        >
          {sugestoes.map((item, indiceItem) => (
            <li
              key={item.slug}
              id={`${listaId}-${indiceItem}`}
              role="option"
              aria-selected={indiceItem === ativo}
              onMouseDown={() => abrir(item.slug)}
              onMouseEnter={() => setAtivo(indiceItem)}
              className={`flex min-h-11 cursor-pointer items-baseline gap-2 px-3 py-2 text-base ${
                indiceItem === ativo ? "bg-surfaceMuted text-ink" : "text-ink"
              }`}
            >
              <span className="font-semibold">{item.curto}</span>
              {item.uf ? <span className="text-sm text-muted">{item.uf}</span> : null}
              <span className="ml-auto font-mono text-sm text-muted">
                {item.questoes.toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {/* O botão fica ABAIXO e com largura automática (a v7 põe `margin-top`
          nele). No celular, campo e botão lado a lado espremem os dois. */}
      {/* O BOTÃO NÃO NASCE DESABILITADO. Com o campo vazio ele ficava a 50% de
          opacidade — e um controle apagado logo abaixo do título é lido como
          "esta página está quebrada", não como "digite primeiro". Sem texto, o
          clique devolve o foco ao campo, que é a única coisa útil que ele pode
          fazer ali. Estado desabilitado é para o que NÃO vai funcionar; este
          vai, só precisa de um passo antes. */}
      <button
        type="button"
        onClick={() => {
          if (sugestoes.length > 0) abrir(sugestoes[0].slug);
          else campoRef.current?.focus();
        }}
        className="mt-4 min-h-11 rounded-control border border-primary bg-primary px-4 text-sm font-medium text-primaryInk transition hover:border-primaryStrong hover:bg-primaryStrong"
      >
        Ver a cara da prova
      </button>

      {/* Sem resultado é CONVITE, nunca beco sem saída — microcopy do guia de
          texto. E o índice completo fica sempre alcançável: quem não sabe o
          nome exato da própria banca não deveria depender de acertar a grafia. */}
      {termo.trim().length >= 2 && sugestoes.length === 0 ? (
        <p className="mt-3 text-sm text-muted">
          Ainda não analisamos essa prova.{" "}
          <Link href="/facies" className="text-marcaViva underline underline-offset-4">
            Veja as {todasAsBancas().length} que já entraram
          </Link>
          .
        </p>
      ) : null}
    </div>
  );
}
