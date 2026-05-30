import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import {
    onAuthStateChanged,
    signInWithCustomToken,
    signOut,
} from "firebase/auth";

import { getFirebaseClientAuth, isFirebaseConfigured } from "@/config/firebase";
import { fetchFirebaseSocialAuthToken } from "@/features/social/firebaseSocialBridge";
import type { RootState } from "@/store/store";

export interface SocialAuthState {
  firebaseUid: string | null;
  status: "idle" | "authenticating" | "authenticated" | "error";
  error: string | null;
}

const initialState: SocialAuthState = {
  firebaseUid: null,
  status: "idle",
  error: null,
};

export const authenticateFirebaseSocial = createAsyncThunk<
  { uid: string },
  void,
  { state: RootState; rejectValue: string }
>("socialAuth/authenticateFirebaseSocial", async (_input, thunkApi) => {
  const session = thunkApi.getState().auth.session;

  if (!session?.accessToken) {
    return thunkApi.rejectWithValue("Missing Drupal access token.");
  }

  if (!isFirebaseConfigured()) {
    return thunkApi.rejectWithValue(
      "Firebase is not configured for this build.",
    );
  }

  try {
    const { token, uid } = await fetchFirebaseSocialAuthToken(session);
    const auth = getFirebaseClientAuth();
    await signInWithCustomToken(auth, token);
    return { uid };
  } catch (error) {
    return thunkApi.rejectWithValue(
      error instanceof Error
        ? error.message
        : "Unable to authenticate Firebase social.",
    );
  }
});

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
      })
      .addCase(authenticateFirebaseSocial.rejected, (state, action) => {
        state.status = "error";
        state.error =
          action.payload ?? "Unable to authenticate Firebase social.";
      })
      .addCase(signOutFirebaseSocial.fulfilled, (state) => {
        state.status = "idle";
        state.firebaseUid = null;
        state.error = null;
      });
  },
});

export const { setFirebaseUid, clearSocialAuthError } = socialAuthSlice.actions;
export const socialAuthReducer = socialAuthSlice.reducer;
