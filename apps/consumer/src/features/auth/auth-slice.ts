import {
    createAsyncThunk,
    createSlice,
    type PayloadAction,
} from "@reduxjs/toolkit";

import type { MicboxxSession } from "@micboxx/contracts";
import {
    isAuthCancelledError,
    revokeDrupalSession,
    signInWithDrupal,
} from "@/features/auth/api";
import {
    clearStoredSession,
    readStoredSession,
    writeStoredSession,
} from "@/features/auth/storage";

const SIGN_IN_CANCELLED = "__SIGN_IN_CANCELLED__";

export interface AuthState {
  session: MicboxxSession | null;
  isHydrating: boolean;
  isSigningIn: boolean;
  error: string | null;
}

const initialState: AuthState = {
  session: null,
  isHydrating: false,
  isSigningIn: false,
  error: null,
};

export const hydrateAuthSession = createAsyncThunk<MicboxxSession | null>(
  "auth/hydrateAuthSession",
  async () => {
    return readStoredSession();
  },
);

export const signIn = createAsyncThunk<
  MicboxxSession,
  void,
  { rejectValue: string }
>("auth/signIn", async (_input, thunkApi) => {
  try {
    const nextSession = await signInWithDrupal();
    await writeStoredSession(nextSession);
    return nextSession;
  } catch (error) {
    if (isAuthCancelledError(error)) {
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
  const currentSession = thunkApi.getState().auth.session;
  await clearStoredSession();
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
      })
      .addCase(signOut.rejected, (state, action) => {
        state.error = action.error.message ?? "Unable to sign out.";
      });
  },
});

export const { clearAuthError, setSession } = authSlice.actions;
export const authReducer = authSlice.reducer;
