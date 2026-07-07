import { redirect } from "next/navigation";

// Simulados não é um destino próprio: é um filtro do Histórico de sessões
// (uma só entidade QuestionBankSession, treino ou simulado). /provas continua
// existindo como deep-link — aterrissa no Histórico já filtrado em Simulados.
export default function ProvasPage() {
  redirect("/revisoes?tipo=provas");
}
