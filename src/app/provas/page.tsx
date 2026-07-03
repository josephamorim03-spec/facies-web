import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ProvasPage() {
  redirect("/revisoes?tipo=provas");
}
