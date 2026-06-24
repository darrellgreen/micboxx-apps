import {
    createAsyncThunk,
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";
import { identifyUser, resetUser } from "@micboxx/analytics";

import { micboxxApi } from "@micboxx/api";

import type { MicboxxSession } from "@micboxx/contracts";
import {
    incrementSessionGeneration,
    isAuthCancelledError,
    isEmailNotVerifiedError,
    revokeDrupalSession,
    signInWithDrupal,
} from "@/features/auth/api";
import {
    clearStoredSession,
    readStoredSession,
    writeStoredSession,
} from "@/features/auth/storage";

const SIGN_IN_CANCELLED = "__SIGN_IN_CANCELLED__";

export interface UnverifiedAccount {
  uid: number;
  email: string;
}

export interface AuthState {
  session: MicboxxSession | null;
  isHydrating: boolean;
  isSigningIn: boolean;
  error: string | null;
  unverifiedAccount: UnverifiedAccount | null;
}

const initialState: AuthState = {
  session: null,
  isHydrating: false,
  isSigningIn: false,
  error: null,
  unverifiedAccount: null,
};

export const hydrateAuthSession = createAsyncThunk<MicboxxSession | null>(
  "auth/hydrateAuthSession",
  async () => {
    // Background hydration of the same session should not increment generation
    // to avoid invalidating legitimate work.
    const session = await readStoredSession();
    if (session?.user.uuid) {
      identifyUser(session.user.uuid);
    }
    return session;
  },
);

export const signIn = createAsyncThunk<
  MicboxxSession,
  void,
  { rejectValue: string }
>("auth/signIn", async (_input, thunkApi) => {
  try {
    incrementSessionGeneration();
    const nextSession = await signInWithDrupal();
    thunkApi.dispatch(micboxxApi.util.resetApiState());
    await writeStoredSession(nextSession);
    identifyUser(nextSession.user.uuid);
    return nextSession;
  } catch (error) {
    if (isAuthCancelledError(error)) {
      return thunkApi.rejectWithValue(SIGN_IN_CANCELLED);
    }

    if (isEmailNotVerifiedError(error)) {
      thunkApi.dispatch(setUnverifiedAccount({ uid: error.uid, email: error.email }));
      return thunkApi.rejectWithValue(SIGN_IN_CANCELLED);
    }

    return thunkApi.rejectWithValue(
      error instanceof Error ? error.message : "Unable to sign in.",
    );
  }
});

export const signOut = createAsyncThunk<
  void,
  void,
  { state: { auth: AuthState } }
>("auth/signOut", async (_input, thunkApi) => {
  incrementSessionGeneration();
  const currentSession = thunkApi.getState().auth.session;
  await clearStoredSession();
  resetUser();
  thunkApi.dispatch(micboxxApi.util.resetApiState());
  await revokeDrupalSession(currentSession);
});

export const expireSession = createAsyncThunk<
  void,
  void,
  { state: { auth: AuthState } }
>("auth/expireSession", async (_input, thunkApi) => {
  incrementSessionGeneration();
  const currentSession = thunkApi.getState().auth.session;
  await clearStoredSession();
  resetUser();
  thunkApi.dispatch(micboxxApi.util.resetApiState());
  thunkApi.dispatch(setSession(null));
  await revokeDrupalSession(currentSession);
});

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearAuthError(state) {
      state.error = null;
    },
    setSession(state, action: PayloadAction<MicboxxSession | null>) {
      state.session = action.payload;
    },
    setUnverifiedAccount(state, action: PayloadAction<UnverifiedAccount>) {
      state.unverifiedAccount = action.payload;
    },
    clearUnverifiedAccount(state) {
      state.unverifiedAccount = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(hydrateAuthSession.pending, (state) => {
        state.isHydrating = true;
        state.error = null;
      })
      .addCase(hydrateAuthSession.fulfilled, (state, action) => {
        state.isHydrating = false;
        state.session = action.payload;
      })
      .addCase(hydrateAuthSession.rejected, (state, action) => {
        state.isHydrating = false;
        state.error = action.error.message ?? "Unable to restore session.";
      })
      .addCase(signIn.pending, (state) => {
        state.isSigningIn = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isSigningIn = false;
        state.session = action.payload;
        state.unverifiedAccount = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isSigningIn = false;
        state.error =
          action.payload === SIGN_IN_CANCELLED
            ? null
            : (action.payload ?? "Unable to sign in.");
      })
      .addCase(signOut.pending, (state) => {
        state.error = null;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.session = null;
        state.unverifiedAccount = null;
      })
      .addCase(signOut.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to sign out.";
      })
      .addCase(expireSession.pending, (state) => {
        state.error = null;
      })
      .addCase(expireSession.fulfilled, (state) => {
        state.session = null;
        state.unverifiedAccount = null;
      })
      .addCase(expireSession.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to expire session.";
      });
  },
});

export const { clearAuthError, setSession, setUnverifiedAccount, clearUnverifiedAccount } = authSlice.actions;
export const authReducer = authSlice.reducer;
