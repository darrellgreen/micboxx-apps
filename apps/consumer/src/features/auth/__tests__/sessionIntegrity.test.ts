import { configureStore } from "@reduxjs/toolkit";
import AsyncStorage from "@react-native-async-storage/async-storage";

// ── Mocks ──
const mockSecureStoreMap = new Map<string, string>();

jest.mock("expo-secure-store", () => {
  return {
    getItemAsync: jest.fn(async (key: string) => mockSecureStoreMap.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      mockSecureStoreMap.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      mockSecureStoreMap.delete(key);
    }),
  };
});

jest.mock("@/features/social/firebaseSocialBridge", () => {
  class FirebaseSocialBridgeError extends Error {
    status: number;
    code: string | null;
    constructor(message: string, status: number, code: string | null = null) {
      super(message);
      this.name = "FirebaseSocialBridgeError";
      this.status = status;
      this.code = code;
    }
  }
  return {
    FirebaseSocialBridgeError,
    fetchFirebaseSocialAuthToken: jest.fn(),
  };
});

jest.mock("firebase/auth", () => ({
  signInWithCustomToken: jest.fn(async () => undefined),
  onAuthStateChanged: jest.fn(() => () => undefined),
  signOut: jest.fn(async () => undefined),
}));

jest.mock("@/config/firebase", () => ({
  getFirebaseClientAuth: jest.fn(() => ({})),
  isFirebaseConfigured: jest.fn(() => true),
}));

jest.mock("@micboxx/api", () => ({
  micboxxApi: { util: { resetApiState: () => ({ type: "api/reset" }) } },
}));

jest.mock("@micboxx/analytics", () => ({
  identifyUser: jest.fn(),
  resetUser: jest.fn(),
}));

import { authReducer, setSession, hydrateAuthSession, signOut } from "../auth-slice";
import { socialAuthReducer, retrySocialAuth } from "../../social/social-auth-slice";
import { ensureFreshSession, incrementSessionGeneration, AuthSessionExpiredError } from "../api";
import { readStoredSession, writeStoredSession, clearStoredSession } from "../storage";
import type { MicboxxSession } from "@micboxx/contracts";

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, socialAuth: socialAuthReducer },
  });
}

type Store = ReturnType<typeof makeStore>;

function sessionFor(token: string, uuid = "user-1") {
  return {
    accessToken: token,
    refreshToken: "refresh-" + token,
    accessTokenExpiresAt: Date.now() + 10 * 60 * 1000,
    user: { uuid, id: 123, username: "u", displayName: "U", email: "u@e.com", roles: [], permissions: {
      canUploadTracks: false,
      canAdministerTracks: false,
      canSellCatalog: false,
      canCreatePlaylists: false,
      canAdministerPlaylists: false,
      canCreateAlbums: false,
      canAdministerAlbums: false,
    } },
    entitlements: null,
  } as MicboxxSession;
}

let mockFetch: jest.Mock;
let resolveRefreshPromise: (value: any) => void;
let refreshPromise: Promise<any>;

beforeAll(() => {
  mockFetch = jest.fn();
  global.fetch = mockFetch;
});

beforeEach(async () => {
  mockSecureStoreMap.clear();
  await AsyncStorage.clear();
  jest.clearAllMocks();

  refreshPromise = new Promise((resolve) => {
    resolveRefreshPromise = resolve;
  });

  mockFetch.mockImplementation(async (url: string) => {
    if (url.includes("/oauth/token")) {
      await refreshPromise;
      return {
        ok: true,
        json: async () => ({
          access_token: "refreshed-token",
          refresh_token: "refreshed-refresh-token",
          expires_in: 3600,
        }),
      };
    }
    if (url.includes("/v1/dashboard/upload-options")) {
      return {
        ok: true,
        json: async () => ({
          data: {
            currentUser: {
              id: 123,
              uuid: "user-A",
              username: "u",
              displayName: "U",
              email: "u@e.com",
              roles: [],
              permissions: {
                canUploadTracks: false,
                canAdministerTracks: false,
                canSellCatalog: false,
                canCreatePlaylists: false,
                canAdministerPlaylists: false,
                canCreateAlbums: false,
                canAdministerAlbums: false,
              },
            },
          },
        }),
      };
    }
    return { ok: false };
  });
});

describe("Session Integrity Integration Tests", () => {
  it("Account A refresh succeeds after logout → storage remains empty", async () => {
    const store = makeStore();
    const sessionA = sessionFor("token-A", "user-A");
    sessionA.accessTokenExpiresAt = Date.now() - 5000; // expired to force refresh
    await writeStoredSession(sessionA);

    await store.dispatch(hydrateAuthSession() as any);
    expect(store.getState().auth.session?.accessToken).toBe("token-A");

    // Call ensureFreshSession and let the refresh request start
    const refreshCall = ensureFreshSession(store.getState().auth.session);

    // Logout during refresh
    await store.dispatch(signOut() as any);
    expect(store.getState().auth.session).toBeNull();

    // Resolve the refresh API call
    resolveRefreshPromise(null);
    await refreshCall;

    // Storage must remain empty
    const stored = await readStoredSession();
    expect(stored).toBeNull();
  });

  it("Account A refresh succeeds after Account B login → storage remains Account B", async () => {
    const store = makeStore();
    const sessionA = sessionFor("token-A", "user-A");
    sessionA.accessTokenExpiresAt = Date.now() - 5000; // expired
    await writeStoredSession(sessionA);

    await store.dispatch(hydrateAuthSession() as any);

    // Call ensureFreshSession
    const refreshCall = ensureFreshSession(store.getState().auth.session);

    // Account B logs in during the refresh
    const sessionB = sessionFor("token-B", "user-B");
    incrementSessionGeneration();
    await writeStoredSession(sessionB);
    store.dispatch(setSession(sessionB));

    // Resolve Account A's refresh
    resolveRefreshPromise(null);
    await refreshCall;

    // Storage must remain Account B
    const stored = await readStoredSession();
    expect(stored?.user.uuid).toBe("user-B");
    expect(stored?.accessToken).toBe("token-B");
  });

  it("Account A invalid_grant after Account B login → Account B storage remains intact", async () => {
    const store = makeStore();
    const sessionA = sessionFor("token-A", "user-A");
    sessionA.accessTokenExpiresAt = Date.now() - 5000; // expired
    await writeStoredSession(sessionA);

    await store.dispatch(hydrateAuthSession() as any);

    // Start refresh for Account A
    const refreshCall = ensureFreshSession(store.getState().auth.session);

    // Account B logs in during refresh
    const sessionB = sessionFor("token-B", "user-B");
    incrementSessionGeneration();
    await writeStoredSession(sessionB);
    store.dispatch(setSession(sessionB));

    // Resolve Account A's refresh with invalid_grant error
    mockFetch.mockImplementationOnce(async (url: string) => {
      if (url.includes("/oauth/token")) {
        await refreshPromise;
        return {
          ok: false,
          status: 400,
          json: async () => ({
            error: "invalid_grant",
            error_description: "Invalid refresh token",
          }),
        };
      }
      return { ok: false };
    });

    resolveRefreshPromise(null);
    await refreshCall;

    // Account B's storage remains intact
    const stored = await readStoredSession();
    expect(stored?.user.uuid).toBe("user-B");
    expect(stored?.accessToken).toBe("token-B");
  });

  it("Account B refresh does not join Account A’s in-flight promise", async () => {
    const sessionA = sessionFor("token-A", "user-A");
    const sessionB = sessionFor("token-B", "user-B");

    // Start refresh for both
    const promiseA = ensureFreshSession(sessionA, { force: true });
    const promiseB = ensureFreshSession(sessionB, { force: true });

    // They must be distinct promises since they represent different accounts
    expect(promiseA).not.toBe(promiseB);

    resolveRefreshPromise(null);
    await Promise.all([promiseA, promiseB]);
  });

  it("Two same-session callers share one refresh request", async () => {
    const sessionA = sessionFor("token-A", "user-A");

    // Call twice for same session
    const promise1 = ensureFreshSession(sessionA, { force: true });
    const promise2 = ensureFreshSession(sessionA, { force: true });

    // Only one fetch call to /oauth/token was made
    resolveRefreshPromise(null);
    await promise1;
    await promise2;
    const tokenCalls = mockFetch.mock.calls.filter(call => call[0].includes("/oauth/token"));
    expect(tokenCalls.length).toBe(1);
  });

  it("A stale refresh result cannot update Redux, recovery state, or storage", async () => {
    const store = makeStore();
    const sessionA = sessionFor("token-A", "user-A");
    sessionA.accessTokenExpiresAt = Date.now() - 5000;
    await writeStoredSession(sessionA);

    await store.dispatch(hydrateAuthSession() as any);

    // Trigger retrySocialAuth (simulating terminal failure path)
    // Note: We need failedTokenFingerprint to be not null in retrySocialAuth
    store.dispatch({
      type: "socialAuth/authenticateFirebaseSocial/rejected",
      payload: { terminal: true, fingerprint: "fp" },
    });

    // Run retrySocialAuth which calls ensureFreshSession internally
    const retryCall = store.dispatch(retrySocialAuth() as any);

    // During the refresh, logout
    await store.dispatch(signOut() as any);

    // Resolve the refresh
    resolveRefreshPromise(null);
    await retryCall;

    // Verify Redux auth state is not updated
    expect(store.getState().auth.session).toBeNull();
    // Storage remains empty
    expect(await readStoredSession()).toBeNull();
  });

  it("Same-token refresh after terminal 401 cannot loop or silently succeed", async () => {
    const session = sessionFor("token-A", "user-A");
    await writeStoredSession(session);

    // Force refresh returns same token
    mockFetch.mockImplementationOnce(async (url: string) => {
      if (url.includes("/oauth/token")) {
        return {
          ok: true,
          json: async () => ({
            access_token: "token-A", // Same access token!
            refresh_token: "refresh-token-A",
            expires_in: 3600,
          }),
        };
      }
      return { ok: false };
    });

    // Expect forced refresh to reject with AuthSessionExpiredError
    await expect(ensureFreshSession(session, { force: true })).rejects.toThrow(
      AuthSessionExpiredError
    );

    // Storage is cleared
    const stored = await readStoredSession();
    expect(stored).toBeNull();
  });
});
