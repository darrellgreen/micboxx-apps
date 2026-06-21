import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
    onAuthStateChanged,
    signInWithCustomToken,
    signOut,
} from "firebase/auth";

import type { MicboxxSession } from "@micboxx/contracts";
import { micboxxApi } from "@micboxx/api";

import { getFirebaseClientAuth, isFirebaseConfigured } from "@/config/firebase";
import {
    ensureFreshSession,
    isAuthSessionExpiredError,
} from "@/features/auth/api";
import {
    setSession,
    signIn as authSignIn,
    signOut as authSignOut,
    expireSession as authExpireSession,
} from "@/features/auth/auth-slice";
import {
    FirebaseSocialBridgeError,
    fetchFirebaseSocialAuthToken,
} from "@/features/social/firebaseSocialBridge";
import type { RootState } from "@/store/store";

// Reason a terminal social-auth failure occurred. Drives recovery: a 401 means
// the credential is rejected (refresh the Drupal session); a 403 means the user
// is authenticated but forbidden (surface, do not loop).
export type SocialAuthTerminalReason = "unauthenticated" | "forbidden";

// User-visible state of the centralized manual-retry workflow.
export type SocialRecoveryStatus =
  | "idle"
  | "refreshing_session"
  | "retrying_social_auth"
  | "session_expired"
  | "transient_error"
  | "permission_denied";

export interface SocialAuthState {
  firebaseUid: string | null;
  status: "idle" | "authenticating" | "authenticated" | "error";
  error: string | null;
  // Fingerprint of the Drupal access token that last failed authentication
  // with a terminal (401/403) result. While this matches the current access
  // token, authentication is not retried — only a token change or an explicit
  // reset clears it. This is what stops the effect-driven retry storm.
  failedTokenFingerprint: string | null;
  // Classification of the last terminal failure (null when not terminal).
  terminalReason: SocialAuthTerminalReason | null;
  // Centralized manual-retry workflow status.
  recovery: SocialRecoveryStatus;
  // True while a retrySocialAuth operation is in flight; collapses rapid taps.
  retryInFlight: boolean;
}

const initialState: SocialAuthState = {
  firebaseUid: null,
  status: "idle",
  error: null,
  failedTokenFingerprint: null,
  terminalReason: null,
  recovery: "idle",
  retryInFlight: false,
};

interface SocialAuthRejection {
  message: string;
  // A terminal failure must NOT be retried with the same access token.
  terminal: boolean;
  // Fingerprint of the access token that failed terminally (null otherwise).
  fingerprint: string | null;
  // 401 vs 403 classification for terminal failures (null otherwise).
  reason: SocialAuthTerminalReason | null;
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
        reason: null,
      });
    }

    if (!isFirebaseConfigured()) {
      return thunkApi.rejectWithValue({
        message: "Firebase is not configured for this build.",
        terminal: true,
        fingerprint: null,
        reason: null,
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
      const reason: SocialAuthTerminalReason | null =
        status === 401
          ? "unauthenticated"
          : status === 403
            ? "forbidden"
            : null;

      return thunkApi.rejectWithValue({
        message:
          error instanceof Error
            ? error.message
            : "Unable to authenticate Firebase social.",
        terminal,
        fingerprint: terminal ? fingerprint : null,
        reason,
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

/**
 * Centralized manual social-auth recovery. The ONLY action feature hooks call
 * to recover a failed social session. SocialAuthGate remains the automatic
 * owner; this thunk never starts competing authentication directly except as
 * the single recovery path below.
 *
 *   terminal 401  → force-refresh the Drupal session once (the existing owner,
 *                   ensureFreshSession). New token → setSession → the gate makes
 *                   exactly one fresh attempt. Invalid/expired → session_expired
 *                   + sign out. Network/service → transient_error, session kept.
 *                   Same token back → cannot recover → session_expired.
 *   terminal 403  → permission_denied (do not loop or refresh).
 *   transient/idle → one explicit attempt with the current token.
 */
export const retrySocialAuth = createAsyncThunk<
  void,
  void,
  { state: RootState }
>(
  "socialAuth/retrySocialAuth",
  async (_input, thunkApi) => {
    const { dispatch, getState } = thunkApi;
    const initial = getState();
    const session = initial.auth.session;
    const social = initial.socialAuth;

    if (!session?.accessToken) {
      dispatch(setSocialRecovery("session_expired"));
      return;
    }

    const startToken = session.accessToken;
    const startUuid = session.user.uuid;
    const isTerminal = social.failedTokenFingerprint !== null;

    // Non-terminal (transient network/429/5xx) or idle: one explicit attempt
    // with the current token. authenticateFirebaseSocial's condition allows it
    // because the token is not fingerprinted as failed.
    if (!isTerminal) {
      dispatch(setSocialRecovery("retrying_social_auth"));
      await dispatch(authenticateFirebaseSocial());
      return;
    }

    // Terminal 403: authenticated but forbidden. Refreshing cannot help.
    if (social.terminalReason === "forbidden") {
      dispatch(setSocialRecovery("permission_denied"));
      return;
    }

    // Terminal 401: force one Drupal session refresh via the existing owner.
    dispatch(setSocialRecovery("refreshing_session"));

    let refreshed: MicboxxSession | null;
    try {
      refreshed = await ensureFreshSession(session, { force: true });
    } catch (error) {
      if (isAuthSessionExpiredError(error)) {
        dispatch(setSession(null));
        dispatch(micboxxApi.util.resetApiState());
        dispatch(setSocialRecovery("session_expired"));
        return;
      }
      // Network/service failure — keep the session, allow another manual retry.
      dispatch(setSocialRecovery("transient_error"));
      return;
    }

    // Staleness/cancellation guard: a logout or account change (or a newer
    // refresh) happened while we were refreshing. Abandon — do not overwrite.
    const current = getState().auth.session;
    if (
      !current ||
      current.user.uuid !== startUuid ||
      current.accessToken !== startToken
    ) {
      return;
    }

    if (!refreshed || refreshed.accessToken === startToken) {
      // Refresh returned the same (or no) token. A prior 401 cannot recover
      // with an unchanged credential → the session is expired.
      dispatch(setSession(null));
      dispatch(micboxxApi.util.resetApiState());
      dispatch(setSocialRecovery("session_expired"));
      return;
    }

    // New token → persist through the auth owner. Clear the terminal guard
    // immediately (so a stray tap can't misread the now-fresh token as still
    // terminal), then signal handoff. SocialAuthGate observes the changed
    // access token and performs exactly one Firebase attempt.
    dispatch(setSession(refreshed));
    dispatch(resetSocialAuth());
    dispatch(setSocialRecovery("retrying_social_auth"));
  },
  {
    // Collapse rapid taps and never run while authentication or another retry
    // is already in flight.
    condition: (_input, { getState }) => {
      const social = getState().socialAuth;
      return !social.retryInFlight && social.status !== "authenticating";
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
    // terminal-failure guard tied to the previous token. Leaves `recovery`
    // untouched so a manual-retry handoff signal survives the gate's reset.
    resetSocialAuth(state) {
      state.status = "idle";
      state.error = null;
      state.failedTokenFingerprint = null;
      state.terminalReason = null;
    },
    // Sets the centralized manual-retry workflow status (drives retry UI).
    setSocialRecovery(state, action: { payload: SocialRecoveryStatus }) {
      state.recovery = action.payload;
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
        state.terminalReason = null;
        state.recovery = "idle";
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
        state.terminalReason = action.payload?.reason ?? null;
        // If this rejection is the re-auth that followed a manual recovery,
        // map the failure into a precise terminal recovery state.
        if (state.recovery === "retrying_social_auth") {
          if (action.payload?.reason === "forbidden") {
            state.recovery = "permission_denied";
          } else if (action.payload?.terminal) {
            state.recovery = "session_expired";
          } else {
            state.recovery = "transient_error";
          }
        }
      })
      .addCase(retrySocialAuth.pending, (state) => {
        state.retryInFlight = true;
      })
      .addCase(retrySocialAuth.fulfilled, (state) => {
        state.retryInFlight = false;
      })
      .addCase(retrySocialAuth.rejected, (state) => {
        state.retryInFlight = false;
      })
      .addCase(signOutFirebaseSocial.fulfilled, (state) => {
        state.status = "idle";
        state.firebaseUid = null;
        state.error = null;
        state.failedTokenFingerprint = null;
        // Note: `recovery` is intentionally preserved here — the gate signs out
        // Firebase whenever the access token goes null, including the
        // session_expired case whose UI must persist.
      })
      // Explicit user logout / sign-in fully reset the recovery workflow.
      .addCase(authSignOut.fulfilled, (state) => {
        state.recovery = "idle";
        state.terminalReason = null;
        state.retryInFlight = false;
        state.failedTokenFingerprint = null;
      })
      .addCase(authSignIn.fulfilled, (state) => {
        state.recovery = "idle";
        state.terminalReason = null;
        state.retryInFlight = false;
        state.failedTokenFingerprint = null;
      })
      .addCase(authExpireSession.fulfilled, (state) => {
        state.recovery = "idle";
        state.terminalReason = null;
        state.retryInFlight = false;
        state.failedTokenFingerprint = null;
      });
  },
});

export const {
  setFirebaseUid,
  clearSocialAuthError,
  resetSocialAuth,
  setSocialRecovery,
} = socialAuthSlice.actions;
export const socialAuthReducer = socialAuthSlice.reducer;
