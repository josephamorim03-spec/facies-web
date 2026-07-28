import { redirect } from "next/navigation";

// Perfil mostrava o mesmo resumo de /planejar. As configurações do aluno
// (nome, meta semanal, retenção, rotina) vivem em Metas e rotina.
export default function PerfilPage() {
  redirect("/rotina-e-metas");
}
