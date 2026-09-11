import { HubDeDestinos } from "./_components/HubDeDestinos";

/**
 * `/mais` — a quinta aba.
 *
 * O conteúdo vive em `_components/HubDeDestinos` porque `/voce` renderiza o
 * mesmo: ver o docstring de lá para o porquê de as duas portas continuarem
 * abertas.
 */
export default function MaisPage() {
  return <HubDeDestinos />;
}
