import type { Metadata } from "next";
import { DocumentoLegal } from "@/components/facies/DocumentoLegal";
import { buscarDocumentoLegal } from "@/lib/api/domains/legal";

/** Política de Privacidade, em rota PÚBLICA. Ver `app/termos/page.tsx`. */
export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Fácies trata os seus dados pessoais.",
  alternates: { canonical: "/privacidade" },
};

export const revalidate = 3600;

export default async function PrivacidadePage() {
  const documento = await buscarDocumentoLegal("politica_privacidade");
  return <DocumentoLegal titulo="Política de Privacidade" documento={documento} />;
}
