import { redirect } from "next/navigation";

// "Revisão turbo" era o nome antigo desta tela. O destino canônico é
// /cards-adaptativos; esta rota permanece só como deep-link histórico.
export default function RevisaoTurboPage() {
  redirect("/cards-adaptativos");
}
