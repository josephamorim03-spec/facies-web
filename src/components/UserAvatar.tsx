"use client";

/**
 * A foto do aluno — QUADRADA, com o raio do sistema.
 *
 * ## Por que nao e' redonda
 *
 * Todo avatar de rede social e' um circulo, e a familiaridade era o argumento.
 * Mas o sistema tem uma regra escrita e mecanizada: *"pilula e' rotulo, botao e'
 * retangulo"* — `rounded-full` em elemento clicavel reprova em
 * `scripts/check-retro-geometry.mjs`, e a regra nao aceita isencao.
 *
 * A alternativa seria abrir uma excecao para o avatar. Nao vale: o circulo nao
 * carrega informacao nenhuma que o quadrado nao carregue, e a foto de perfil e'
 * justamente onde o produto pode parecer ele mesmo sem custar reconhecimento. O
 * raio de 2px (`rounded-control`) e' o mesmo de todo controle do app.
 *
 * ## Por que ele saiu de `Nav.tsx`
 *
 * Vivia local ali, servindo so' o rodape da sidebar. Com a aba "Você" no
 * celular ele passou a ter dois consumidores em superficies diferentes — e o
 * caminho de um componente local copiado e' como as quatro folhas a mao
 * nasceram.
 *
 * ## Sem foto
 *
 * A inicial em `bg-primary`. Nao e' fallback de erro: a maioria dos cadastros
 * por e-mail nunca tera foto, e a inicial precisa ler como escolha, nao como
 * imagem quebrada.
 */

export type TamanhoDoAvatar = "tab" | "sm" | "md" | "lg";

const DIMENSAO: Record<TamanhoDoAvatar, string> = {
  // 20px, o mesmo do icone das outras abas (`h-5 w-5`), para a fileira nao
  // ganhar um degrau de altura so' na quinta.
  tab: "h-5 w-5 text-[9px]",
  sm: "h-7 w-7 text-xs",
  md: "h-9 w-9 text-sm",
  lg: "h-14 w-14 text-lg",
};

export function UserAvatar({
  photoUrl,
  displayName,
  size = "sm",
}: {
  photoUrl?: string | null;
  displayName?: string | null;
  size?: TamanhoDoAvatar;
}) {
  const dim = DIMENSAO[size];
  const initial = (displayName ?? "?").trim()[0]?.toUpperCase() ?? "?";

  // ⚠️ SEM BORDA NA ABA. Nas outras superficies a hairline separa a foto do
  // fundo; na barra ela competiria com o `border-t-2` que marca a aba ativa, e
  // duas linhas a 20px de distancia viram ruido em vez de estado.
  const borda = size === "tab" ? "" : " border border-edge";

  if (photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt=""
        aria-hidden="true"
        // Obrigatorio para `lh3.googleusercontent.com`: sem isto o Google
        // recusa a imagem quando o referer e' outro dominio.
        referrerPolicy="no-referrer"
        className={`${dim} shrink-0 rounded-control object-cover${borda}`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${dim} flex shrink-0 items-center justify-center rounded-control bg-primary font-semibold text-primaryInk${borda}`}
    >
      {initial}
    </span>
  );
}
