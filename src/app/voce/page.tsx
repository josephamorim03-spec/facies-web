import { HubDeDestinos } from "@/app/mais/_components/HubDeDestinos";

/**
 * `/voce` — a porta antiga do hub, que continua aberta.
 *
 * ⚠️ NÃO É UM REDIRECT, e a diferença é medida. Esta rota está no avatar da
 * sidebar, em links dentro do produto e no histórico de quem já usa o app. Um
 * `redirect()` em `page.tsx` continuou a ser PRÉ-RENDERIZADO como HTML neste
 * repositório, inclusive depois de apagar `.next` — está registado em
 * `next.config.js`, no bloco dos flashcards. E um 308 em `next.config.js`
 * queimaria a URL para sempre, que é exatamente o que já aconteceu com `/rota`.
 *
 * Renderizar o mesmo componente custa nada e não fecha porta nenhuma.
 */
export default function VocePage() {
  return <HubDeDestinos />;
}
