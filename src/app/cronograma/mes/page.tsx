import CronogramaClientPage from "../CronogramaClientPage";

/**
 * A seção "Mês" do Plano — a MESMA agenda, vista de mais longe.
 *
 * ## Por que ela ganhou rota própria
 *
 * O mês já existia, e morava em `/cronograma?view=month`. Isso funcionava
 * enquanto a alternância era um botão dentro da tela; deixou de funcionar
 * quando "Semana" e "Mês" viraram seções da barra.
 *
 * `navConfig` casa seção por PATHNAME — `normalizePathname` corta a query antes
 * de comparar. Duas seções na mesma URL empatariam no comprimento do casamento,
 * e a segunda venceria sempre: o aluno no mês veria "Semana" acesa, ou o
 * contrário. Não é preferência de URL bonita; é o que faz a barra dizer a
 * verdade sobre onde ele está.
 *
 * `?view=month` continua a funcionar e redireciona para cá (ver
 * `../page.tsx`) — links salvos e o atalho `/agenda-operacional` não quebram.
 */
type PageProps = {
  searchParams: Promise<{
    day?: string | string[];
    anchor?: string | string[];
  }>;
};

function validIsoDay(value: string | string[] | undefined): string | null {
  const day = Array.isArray(value) ? value[0] : value;
  return day && /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

export default async function Page({ searchParams }: PageProps) {
  const params = searchParams ? await searchParams : undefined;
  return (
    <CronogramaClientPage
      initialView="month"
      initialAnchor={validIsoDay(params?.anchor) ?? validIsoDay(params?.day)}
      initialSelectedDay={validIsoDay(params?.day) ?? validIsoDay(params?.anchor)}
    />
  );
}
