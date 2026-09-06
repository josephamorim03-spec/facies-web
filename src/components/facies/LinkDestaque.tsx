"use client";

import Link from "next/link";

import { registrarEvento } from "@/lib/faciesFunnel";

/**
 * O CTA do card da prova em destaque, instrumentado.
 *
 * `DestaqueProva` é server component, e o `<Link>` dele era cego: a transição
 * home → `/prova/[slug]` não emitia nada. Dava para saber quantas pessoas viam
 * a home e quantas copiavam a imagem, e não dava para saber quantas seguiam
 * para a prova nacional — que é o atalho da maioria e o caminho mais provável
 * da página inteira.
 *
 * Só o CTA vira cliente. Envolver o card todo mandaria para o bundle uma grade
 * de números que nunca muda.
 *
 * O evento sai na INTENÇÃO, antes da navegação: `registrarEvento` usa
 * `keepalive: true`, então a requisição sobrevive à troca de página.
 */
export function LinkDestaque({
  slug,
  chave,
  children,
}: {
  slug: string;
  /** `exam_key` — a mesma chave que os demais eventos gravam, nunca o slug. */
  chave: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/prova/${slug}`}
      onClick={() => registrarEvento("destaque_clicado", chave)}
      className="paper-control mt-6 inline-flex rounded-control border border-primary bg-primary px-5 py-2.5 text-sm font-medium text-primaryInk hover:border-[var(--color-primary-strong)] hover:bg-[var(--color-primary-strong)]"
    >
      {children}
    </Link>
  );
}
