import { redirect } from "next/navigation";

// Planejar aterrissa na ferramenta, não num resumo sobre ela: o calendário do
// mês é a função dominante desta intenção. Metas ficam na sub-aba ao lado.
export default function PlanejarPage() {
  redirect("/cronograma");
}
