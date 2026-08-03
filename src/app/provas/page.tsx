import { redirect } from "next/navigation";

// Simulados não é um destino próprio: é uma leitura do histórico de sessões
// (uma só entidade QuestionBankSession, treino ou simulado).
//
// O destino era `/revisoes?tipo=provas`, mas `/revisoes` virou 308 para
// `/evolucao` e o filtro por tipo não sobreviveu à reescrita do histórico como
// aba. O link antigo continuava respondendo — só que aterrissava na aba
// Gráficos, sem nada de simulados à vista. Aponta agora para o histórico real;
// quando o filtro por tipo voltar, o deep-link volta com ele.
export default function ProvasPage() {
  redirect("/evolucao");
}
