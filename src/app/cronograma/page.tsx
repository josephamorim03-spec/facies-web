import CronogramaClientPage from "./CronogramaClientPage";

/**
 * A seção "Semana" do Plano. O mês mora em `./mes`.
 *
 * ⚠️ `?view=month` não chega aqui: `next.config.js` o encaminha para
 * `/cronograma/mes` (redirect com `has: query`). O encaminhamento é ALI e não
 * num `redirect()` desta função — este repositório já mediu que um `redirect()`
 * dentro de `page.tsx` continua a ser PRÉ-RENDERIZADO como HTML (ver a nota dos
 * flashcards em `next.config.js`), e o bloco `redirects()` é verificável por
 * `curl -I`.
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
  const anchor = validIsoDay(params?.anchor);
  const day = validIsoDay(params?.day);
  return (
    <CronogramaClientPage
      initialView="week"
      initialAnchor={anchor ?? day}
      initialSelectedDay={day ?? anchor}
    />
  );
}
