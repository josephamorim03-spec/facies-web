"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

type NavbarContextValue = {
  title: ReactNode;
  actions: ReactNode;
  setTitle: (t: ReactNode) => void;
  setActions: (a: ReactNode) => void;
};

export const NavbarContext = createContext<NavbarContextValue>({
  title: null,
  actions: null,
  setTitle: () => undefined,
  setActions: () => undefined,
});

export function NavbarProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState<ReactNode>(null);
  const [actions, setActionsState] = useState<ReactNode>(null);
  const setTitle = useCallback((t: ReactNode) => setTitleState(t), []);
  const setActions = useCallback((a: ReactNode) => setActionsState(a), []);
  return (
    <NavbarContext.Provider value={{ title, actions, setTitle, setActions }}>
      {children}
    </NavbarContext.Provider>
  );
}

export function useNavbar() {
  return useContext(NavbarContext);
}
