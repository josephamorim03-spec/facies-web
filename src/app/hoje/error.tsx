"use client";

import { TelaDeErro } from "@/components/ui/TelaDeErro";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <TelaDeErro error={error} reset={reset} titulo="Não foi possível abrir o seu dia." />;
}
