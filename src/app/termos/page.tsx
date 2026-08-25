import type { Metadata } from "next";
import { DocumentoLegal } from "@/components/facies/DocumentoLegal";
import { buscarDocumentoLegal } from "@/lib/api/domains/legal";

/**
 * Termos de Uso, em rota PÚBLICA.
 *
 * Servida no servidor e não em client component: o texto precisa existir no HTML
 * para buscador e para leitor de tela, e porque quem chega aqui pelo link do
 * aceite ainda não tem sessão para uma chamada autenticada acontecer.
 */
export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Os termos que regem o uso da Fácies.",
  alternates: { canonical: "/termos" },
};

// Documento muda por publicação, não por requisição. Uma hora de cache tira a
// leitura do caminho do banco sem deixar uma versão nova envelhecer na tela.
export const revalidate = 3600;

export default async function TermosPage() {
  const documento = await buscarDocumentoLegal("termos_de_uso");
  return <DocumentoLegal titulo="Termos de Uso" documento={documento} />;
}
