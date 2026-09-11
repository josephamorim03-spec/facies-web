interface SkeletonProps {
  className?: string;
  /**
   * O que está a carregar, para quem não vê a tela.
   *
   * ⚠️ ESTA PROP FALTAVA, e três telas passavam-na na mesma. `MapaClientPage`,
   * `PlanoClientPage` e a Evolução escreviam `aria-label="… carregando"` e o
   * componente descartava o atributo em silêncio — o TypeScript não reclama de
   * atributo com hífen num componente próprio. Resultado: com `aria-hidden`
   * ligado e nada a anunciar, o leitor de tela ficava em SILÊNCIO ABSOLUTO
   * durante o carregamento das três.
   *
   * Sem rótulo, o comportamento antigo continua certo: um esqueleto decorativo
   * ao lado de outro conteúdo não deve ser anunciado. Com rótulo, ele vira uma
   * região viva que diz o que está a acontecer — como o `LoadBar`, cujo `label`
   * é obrigatório exatamente por isto.
   */
  rotulo?: string;
}

export function Skeleton({ className = "", rotulo }: SkeletonProps) {
  if (rotulo) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={rotulo}
        className={`paper-skeleton block ${className}`}
      />
    );
  }
  return <div aria-hidden="true" className={`paper-skeleton block ${className}`} />;
}
