import { createContext, useContext, useMemo, useState } from 'react';
import type { User } from '../types/api';

type AuthState = {
  token: string | null;
  user: User | null;
};

type AuthContextValue = AuthState & {
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
};

const STORAGE_KEY = 'comparesome-auth';

function loadState(): AuthState {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return { token: null, user: null };
  }
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return { token: null, user: null };
  }
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>(() => loadState());

  const save = (next: AuthState) => {
    setState(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      ...state,
      login: (token: string, user: User) => save({ token, user }),
      logout: () => save({ token: null, user: null }),
      updateUser: (user: User) => save({ token: state.token, user })
    }),
    [state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
