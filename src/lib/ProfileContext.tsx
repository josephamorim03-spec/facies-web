"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * Nome do aluno, para quem ja esta dentro do `AppShell`.
 *
 * O `AppShell` ja busca o perfil — e nao so para saber o nome: e a mesma
 * chamada que decide redirect de acesso e de onboarding. Buscar de novo numa
 * pagina filha seria uma segunda ida a rede pelo dado que ja esta em memoria
 * a um nivel de distancia.
 *
 * Por isso um contexto e nao um hook de fetch: o dado ja existe, falta so
 * alcance. Quem estiver fora do shell (login, ativacao) recebe `null` e cai no
 * texto sem nome, que e o certo — ali nao ha aluno identificado.
 */
const ProfileDisplayNameContext = createContext<string | null>(null);

export function ProfileDisplayNameProvider({
  displayName,
  children,
}: {
  displayName: string | null;
  children: ReactNode;
}) {
  return (
    <ProfileDisplayNameContext.Provider value={displayName}>
      {children}
    </ProfileDisplayNameContext.Provider>
  );
}

export function useProfileDisplayName(): string | null {
  return useContext(ProfileDisplayNameContext);
}

/**
 * Primeiro nome, ou `null`.
 *
 * A extracao ja existia inline em `Nav.tsx` (`displayName?.split(" ")[0]`), e
 * duas copias da mesma regra divergem na primeira vez que alguem tratar um
 * nome com espaco duplo ou so espacos.
 */
export function firstName(displayName: string | null | undefined): string | null {
  const trimmed = (displayName ?? "").trim();
  if (!trimmed) return null;
  return trimmed.split(/\s+/)[0] ?? null;
}
