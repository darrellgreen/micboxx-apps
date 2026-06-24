import { useEffect, type FC, type PropsWithChildren } from "react";

import type { MicboxxSession } from "@micboxx/contracts";
import {
    hydrateAuthSession,
    signIn as signInThunk,
    signOut as signOutThunk,
    type UnverifiedAccount,
} from "@/features/auth/auth-slice";
import { useAppDispatch, useAppSelector } from "@/store/hooks";

interface AuthContextValue {
  session: MicboxxSession | null;
  isHydrating: boolean;
  isSigningIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  unverifiedAccount: UnverifiedAccount | null;
}

export const AuthProvider: FC<PropsWithChildren> = ({ children }) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    void dispatch(hydrateAuthSession());
  }, [dispatch]);

  return children;
};

export function useAuth(): AuthContextValue {
  const dispatch = useAppDispatch();
  const session = useAppSelector((state) => state.auth.session);
  const isHydrating = useAppSelector((state) => state.auth.isHydrating);
  const isSigningIn = useAppSelector((state) => state.auth.isSigningIn);
  const error = useAppSelector((state) => state.auth.error);
  const unverifiedAccount = useAppSelector((state) => state.auth.unverifiedAccount);

  return {
    session,
    isHydrating,
    isSigningIn,
    error,
    unverifiedAccount,
    signIn: async () => {
      await dispatch(signInThunk());
    },
    signOut: async () => {
      await dispatch(signOutThunk());
    },
  };
}
