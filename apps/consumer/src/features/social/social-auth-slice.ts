import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
    onAuthStateChanged,
    signInWithCustomToken,
    signOut,
} from "firebase/auth";

import { getFirebaseClientAuth, isFirebaseConfigured } from "@/config/firebase";
import {
    FirebaseSocialBridgeError,
    fetchFirebaseSocialAuthToken,
} from "@/features/social/firebaseSocialBridge";
import type { RootState } from "@/store/store";

export interface SocialAuthState {
  firebaseUid: string | null;
  status: "idle" | "authenticating" | "authenticated" | "error";
  error: string | null;
  // Fingerprint of the Drupal access token that last failed authentication
  // with a terminal (401/403) result. While this matches the current access
  // token, authentication is not retried — only a token change or an explicit
  // reset clears it. This is what stops the effect-driven retry storm.
  failedTokenFingerprint: string | null;
}

const initialState: SocialAuthState = {
  firebaseUid: null,
  status: "idle",
  error: null,
  failedTokenFingerprint: null,
};

interface SocialAuthRejection {
  message: string;
  // A terminal failure must NOT be retried with the same access token.
  terminal: boolean;
  // Fingerprint of the access token that failed terminally (null otherwise).
  fingerprint: string | null;
}

// Cheap, synchronous, non-reversible fingerprint. We never store or log the
// raw Drupal access token here — only this short hash — so the failed-token
// guard cannot leak credentials.
export function fingerprintAccessToken(token: string): string {
  let hash = 0;
  for (let index = 0; index < token.length; index += 1) {
    hash = (hash * 31 + token.charCodeAt(index)) | 0;
  }
  return `fp_${(hash >>> 0).toString(16)}`;
}

export const authenticateFirebaseSocial = createAsyncThunk<
  { uid: string },
  void,
  { state: RootState; rejectValue: SocialAuthRejection }
>(
  "socialAuth/authenticateFirebaseSocial",
  async (_input, thunkApi) => {
    const session = thunkApi.getState().auth.session;

    if (!session?.accessToken) {
      return thunkApi.rejectWithValue({
        message: "Missing Drupal access token.",
        terminal: true,
        fingerprint: null,
      });
    }

    if (!isFirebaseConfigured()) {
      return thunkApi.rejectWithValue({
        message: "Firebase is not configured for this build.",
        terminal: true,
        fingerprint: null,
      });
    }

    const fingerprint = fingerprintAccessToken(session.accessToken);

    try {
      const { token, uid } = await fetchFirebaseSocialAuthToken(session);
      const auth = getFirebaseClientAuth();
      await signInWithCustomToken(auth, token);
      return { uid };
    } catch (error) {
      // 401/403 mean this access token will never succeed — mark it terminal
      // so no caller retries it. Everything else (network, 5xx, Firebase
      // config) is left non-terminal and recoverable via an explicit retry or
      // a token refresh, but is still never auto-retried from an effect.
      const status =
        error instanceof FirebaseSocialBridgeError ? error.status : undefined;
      const terminal = status === 401 || status === 403;

      return thunkApi.rejectWithValue({
        message:
          error instanceof Error
            ? error.message
            : "Unable to authenticate Firebase social.",
        terminal,
        fingerprint: terminal ? fingerprint : null,
      });
    }
  },
  {
    // Concurrency + terminal-failure guard. Even if several feature hooks
    // observe an actionable state in the same render pass, only the first
    // dispatch survives: the synchronous `pending` reducer flips status to
    // "authenticating" before the next dispatch evaluates this condition.
    condition: (_input, { getState }) => {
      const state = getState();
      const social = state.socialAuth;

      if (social.status === "authenticating") {
        return false;
      }

      const accessToken = state.auth.session?.accessToken;
      if (!accessToken) {
        return false;
      }

      // Do not retry a token that already failed terminally.
      if (
        social.failedTokenFingerprint !== null &&
        social.failedTokenFingerprint === fingerprintAccessToken(accessToken)
      ) {
        return false;
      }

      return true;
    },
  },
);

export const signOutFirebaseSocial = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>("socialAuth/signOutFirebaseSocial", async (_input, thunkApi) => {
  if (!isFirebaseConfigured()) {
    return;
  }

  try {
    const auth = getFirebaseClientAuth();
    await signOut(auth);
  } catch (error) {
    return thunkApi.rejectWithValue(
      error instanceof Error
        ? error.message
        : "Unable to sign out Firebase social.",
    );
  }
});

export function subscribeToFirebaseAuthState(
  onUidChange: (uid: string | null) => void,
) {
  if (!isFirebaseConfigured()) {
    onUidChange(null);
    return () => undefined;
  }

  const auth = getFirebaseClientAuth();
  return onAuthStateChanged(auth, (user) => {
    onUidChange(user?.uid ?? null);
  });
}

const socialAuthSlice = createSlice({
  name: "socialAuth",
  initialState,
  reducers: {
    setFirebaseUid(state, action: { payload: string | null }) {
      state.firebaseUid = action.payload;
      state.status = action.payload ? "authenticated" : "idle";
      if (action.payload) {
        state.error = null;
      }
    },
    clearSocialAuthError(state) {
      state.error = null;
    },
    // Called by SocialAuthGate when the Drupal access token changes so the new
    // token gets exactly one fresh authentication attempt, clearing any prior
    // terminal-failure guard tied to the previous token.
    resetSocialAuth(state) {
      state.status = "idle";
      state.error = null;
      state.failedTokenFingerprint = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(authenticateFirebaseSocial.pending, (state) => {
        state.status = "authenticating";
        state.error = null;
      })
      .addCase(authenticateFirebaseSocial.fulfilled, (state, action) => {
        state.status = "authenticated";
        state.firebaseUid = action.payload.uid;
        state.error = null;
        state.failedTokenFingerprint = null;
      })
      .addCase(authenticateFirebaseSocial.rejected, (state, action) => {
        state.status = "error";
        state.error =
          action.payload?.message ?? "Unable to authenticate Firebase social.";
        // Record the token fingerprint only for terminal failures so the
        // condition guard refuses to retry the same doomed token.
        if (action.payload?.terminal && action.payload.fingerprint) {
          state.failedTokenFingerprint = action.payload.fingerprint;
        }
      })
      .addCase(signOutFirebaseSocial.fulfilled, (state) => {
        state.status = "idle";
        state.firebaseUid = null;
        state.error = null;
        state.failedTokenFingerprint = null;
      });
  },
});

export const { setFirebaseUid, clearSocialAuthError, resetSocialAuth } =
  socialAuthSlice.actions;
export const socialAuthReducer = socialAuthSlice.reducer;
