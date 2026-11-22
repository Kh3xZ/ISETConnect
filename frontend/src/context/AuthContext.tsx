import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ApiError,
  RegisterBody,
  UserResponse,
  getMe,
  login,
  register,
  setAuthToken,
  setUnauthorizedHandler,
} from '../services/api';
import { tokenStorage } from '../services/tokenStorage';

interface AuthContextValue {
  user: UserResponse | null;

  loading: boolean;
  signIn: (email: string, password: string) => Promise<UserResponse>;
  signUp: (body: RegisterBody) => Promise<UserResponse>;
  signOut: () => Promise<void>;
  /** Replace the cached user after a profile edit. */
  updateUser: (u: UserResponse) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const signOut = useCallback(async () => {
    setAuthToken(null);
    setUser(null);
    await tokenStorage.clear();
  }, []);


  useEffect(() => {
    setUnauthorizedHandler(() => {
      void signOut();
    });

    (async () => {
      try {
        const saved = await tokenStorage.get();
        if (saved) {
          setAuthToken(saved);
          setUser(await getMe());
        }
      } catch (e) {

        if (e instanceof ApiError && e.status === 401) await signOut();
        else setAuthToken(null);
      } finally {
        setLoading(false);
      }
    })();

    return () => setUnauthorizedHandler(null);
  }, [signOut]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await login(email, password);
    setAuthToken(res.token);
    await tokenStorage.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);


  const signUp = useCallback(async (body: RegisterBody) => {
    const res = await register(body);
    setAuthToken(res.token);
    await tokenStorage.set(res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const value = useMemo(
    () => ({ user, loading, signIn, signUp, signOut, updateUser: setUser }),
    [user, loading, signIn, signUp, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
