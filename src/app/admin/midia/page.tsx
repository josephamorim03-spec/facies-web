import type { Metadata } from "next";

import { FORMATOS, PECAS, assuntosDaPeca, caminhoDaPeca, type FormatoId } from "@/lib/midia";
import { CatalogoMidia, type ItemCatalogo } from "./_components/CatalogoMidia";

/**
 * O catálogo da central de mídia — listar e baixar, nunca editar.
 *
 * ## Por que server component
 *
 * A enumeração importa o dataset estático (600 KB). Se esta página fosse um
 * componente cliente, o JSON inteiro iria para o bundle do navegador — a mesma
 * classe de inchaço que `lib/facies.ts` documenta ter evitado na home. Aqui a
 * enumeração roda no servidor e só a lista derivada (143 itens, poucos KB) chega
 * ao cliente.
 *
 * ## Catálogo, não editor
 *
 * O teste dos 5 minutos (§4 do doc de mídia) se decide aqui: escolher prova +
 * template + baixar. Editor visual é a armadilha que o doc já nomeia; esta tela
 * só deixa ver e baixar.
 */

export const metadata: Metadata = { title: "Mídia" };

const ORDEM_FORMATOS: FormatoId[] = ["feed", "story"];

export default function AdminMidiaPage() {
  const itens: ItemCatalogo[] = PECAS.flatMap((peca) =>
    assuntosDaPeca(peca.id).map((assunto) => ({
      pecaId: peca.id,
      pecaRotulo: peca.rotulo,
      assuntoTipo: assunto.tipo,
      slug: assunto.slug,
      sigla: assunto.sigla,
      caminhoPublico: assunto.caminho,
      formatos: ORDEM_FORMATOS.map((formato) => ({
        id: formato,
        rotulo: FORMATOS[formato].rotulo,
        caminho: caminhoDaPeca(peca.id, assunto.slug, formato),
      })),
    })),
  );

  return <CatalogoMidia itens={itens} />;
}
