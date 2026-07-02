import { redirect } from "next/navigation";

export default function ProvasPage() {
  redirect("/revisoes?tipo=provas");
}
