import { redirect } from "next/navigation";

// "/desempenho" chamava-se "Plano de estudo" e renderizava um resumo — nome que
// ainda colidia com o Desempenho de verdade (Acompanhar). O plano agora começa
// no calendário; as metas vivem em /rotina-e-metas.
export default function DesempenhoPage() {
  redirect("/cronograma");
}
