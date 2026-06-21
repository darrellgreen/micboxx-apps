import { configureStore } from "@reduxjs/toolkit";
import { readFileSync } from "fs";
import { join } from "path";

// ── Leaf-dependency mocks (the containment + Firebase bridge stay real) ──────
// Error classes are defined INSIDE the factories: ES-import hoisting runs the
// factories before any outer `class` declaration would initialize, so a class
// referenced from outer scope would be `undefined` at factory time.

// Typed as `any` so the jest mock-helper overloads (mockResolvedValueOnce etc.)
// accept our session fixtures without per-call generics. Runtime is unaffected.
/* eslint-disable @typescript-eslint/no-explicit-any */
const mockFetchFirebaseSocialAuthToken: any = jest.fn();
const mockSignInWithCustomToken: any = jest.fn(async () => undefined);
const mockEnsureFreshSession: any = jest.fn();
/* eslint-enable @typescript-eslint/no-explicit-any */

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
    fetchFirebaseSocialAuthToken: (...args: unknown[]) =>
      mockFetchFirebaseSocialAuthToken(...args),
  };
});

jest.mock("firebase/auth", () => ({
  signInWithCustomToken: (...args: unknown[]) =>
    mockSignInWithCustomToken(...args),
  onAuthStateChanged: jest.fn(() => () => undefined),
  signOut: jest.fn(async () => undefined),
}));

jest.mock("@/config/firebase", () => ({
  getFirebaseClientAuth: jest.fn(() => ({})),
  isFirebaseConfigured: jest.fn(() => true),
}));

jest.mock("@/features/auth/api", () => {
  class AuthSessionExpiredError extends Error {
    constructor() {
      super("expired");
      this.name = "AuthSessionExpiredError";
    }
  }
  return {
    AuthSessionExpiredError,
    ensureFreshSession: (...args: unknown[]) => mockEnsureFreshSession(...args),
    isAuthSessionExpiredError: (error: unknown) =>
      error instanceof AuthSessionExpiredError,
    // Used by the auth-slice import surface (unused in these tests).
    isAuthCancelledError: () => false,
    revokeDrupalSession: jest.fn(async () => undefined),
    signInWithDrupal: jest.fn(),
  };
});

jest.mock("@/features/auth/storage", () => ({
  clearStoredSession: jest.fn(async () => undefined),
  readStoredSession: jest.fn(async () => null),
  writeStoredSession: jest.fn(async () => undefined),
}));

jest.mock("@micboxx/api", () => ({
  micboxxApi: { util: { resetApiState: () => ({ type: "api/reset" }) } },
}));

jest.mock("@micboxx/analytics", () => ({
  identifyUser: jest.fn(),
  resetUser: jest.fn(),
}));

// Imported after the mocks are registered.
import { authReducer, setSession } from "@/features/auth/auth-slice";
import {
  authenticateFirebaseSocial,
  fingerprintAccessToken,
  retrySocialAuth,
  socialAuthReducer,
} from "@/features/social/social-auth-slice";
import { FirebaseSocialBridgeError } from "@/features/social/firebaseSocialBridge";
import { AuthSessionExpiredError } from "@/features/auth/api";

function makeStore() {
  return configureStore({
    reducer: { auth: authReducer, socialAuth: socialAuthReducer },
  });
}

type Store = ReturnType<typeof makeStore>;

function sessionFor(token: string, uuid = "user-1") {
  return {
    accessToken: token,
    refreshToken: "refresh-token",
    accessTokenExpiresAt: Date.now() + 10 * 60 * 1000,
    user: { uuid, username: "u", displayName: "U", email: "u@e.com" },
  } as never;
}

/** Drive a terminal social-auth failure of the given status onto the store. */
async function seedTerminalFailure(store: Store, token: string, status: number) {
  (store.dispatch as any)(setSession(sessionFor(token)));
  mockFetchFirebaseSocialAuthToken.mockRejectedValueOnce(
    new FirebaseSocialBridgeError("rejected", status),
  );
  await (store.dispatch as any)(authenticateFirebaseSocial());
}

beforeEach(() => {
  jest.clearAllMocks();
  mockEnsureFreshSession.mockReset();
  mockFetchFirebaseSocialAuthToken.mockReset();
  mockSignInWithCustomToken.mockReset();
  mockSignInWithCustomToken.mockResolvedValue(undefined);
});

describe("retrySocialAuth — terminal 401", () => {
  it("never re-requests with the same token; refreshes the Drupal session instead", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 401);
    expect(store.getState().socialAuth.failedTokenFingerprint).toBe(
      fingerprintAccessToken("token-A"),
    );
    mockFetchFirebaseSocialAuthToken.mockClear();

    mockEnsureFreshSession.mockResolvedValueOnce(sessionFor("token-B"));

    await (store.dispatch as any)(retrySocialAuth());

    expect(mockEnsureFreshSession).toHaveBeenCalledWith(expect.anything(), {
      force: true,
    });
    expect(mockFetchFirebaseSocialAuthToken).not.toHaveBeenCalled();

    const state = store.getState();
    expect(state.auth.session?.accessToken).toBe("token-B");
    expect(state.socialAuth.failedTokenFingerprint).toBeNull();
    expect(state.socialAuth.recovery).toBe("retrying_social_auth");
  });

  it("after refresh + new token, the gate's attempt is allowed exactly once", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 401);
    mockEnsureFreshSession.mockResolvedValueOnce(sessionFor("token-B"));
    await (store.dispatch as any)(retrySocialAuth());
    mockFetchFirebaseSocialAuthToken.mockClear();

    // Simulate SocialAuthGate's single attempt on the new token.
    mockFetchFirebaseSocialAuthToken.mockResolvedValueOnce({
      token: "fb",
      uid: "user-1",
    });
    await (store.dispatch as any)(authenticateFirebaseSocial());

    expect(mockFetchFirebaseSocialAuthToken).toHaveBeenCalledTimes(1);
    expect(store.getState().socialAuth.status).toBe("authenticated");
    expect(store.getState().socialAuth.recovery).toBe("idle");
  });

  it("refresh returning the SAME token does not loop or silently succeed → session_expired", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 401);
    mockEnsureFreshSession.mockResolvedValueOnce(sessionFor("token-A"));

    await (store.dispatch as any)(retrySocialAuth());

    const state = store.getState();
    expect(state.socialAuth.recovery).toBe("session_expired");
    expect(state.auth.session).toBeNull();
  });

  it("refresh reporting an invalid/expired session → session_expired", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 401);
    mockEnsureFreshSession.mockRejectedValueOnce(new AuthSessionExpiredError());

    await (store.dispatch as any)(retrySocialAuth());

    const state = store.getState();
    expect(state.socialAuth.recovery).toBe("session_expired");
    expect(state.auth.session).toBeNull();
  });

  it("refresh network failure preserves the session and stays manually retryable", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 401);
    mockEnsureFreshSession.mockRejectedValueOnce(new Error("network down"));

    await (store.dispatch as any)(retrySocialAuth());

    let state = store.getState();
    expect(state.socialAuth.recovery).toBe("transient_error");
    expect(state.auth.session?.accessToken).toBe("token-A");

    // Still retryable: a follow-up refresh that succeeds recovers.
    mockEnsureFreshSession.mockResolvedValueOnce(sessionFor("token-B"));
    await (store.dispatch as any)(retrySocialAuth());
    state = store.getState();
    expect(state.auth.session?.accessToken).toBe("token-B");
  });
});

describe("retrySocialAuth — terminal 403", () => {
  it("surfaces permission_denied without refreshing or looping", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 403);

    await (store.dispatch as any)(retrySocialAuth());

    expect(mockEnsureFreshSession).not.toHaveBeenCalled();
    expect(store.getState().socialAuth.recovery).toBe("permission_denied");
    expect(store.getState().auth.session?.accessToken).toBe("token-A");
  });
});

describe("retrySocialAuth — transient social failure", () => {
  it("permits one explicit retry with the current token (no refresh)", async () => {
    const store = makeStore();
    (store.dispatch as any)(setSession(sessionFor("token-A")));
    mockFetchFirebaseSocialAuthToken.mockRejectedValueOnce(
      new FirebaseSocialBridgeError("network", 0),
    );
    await (store.dispatch as any)(authenticateFirebaseSocial());
    expect(store.getState().socialAuth.failedTokenFingerprint).toBeNull();
    mockFetchFirebaseSocialAuthToken.mockClear();

    mockFetchFirebaseSocialAuthToken.mockResolvedValueOnce({
      token: "fb",
      uid: "user-1",
    });
    await (store.dispatch as any)(retrySocialAuth());

    expect(mockEnsureFreshSession).not.toHaveBeenCalled();
    expect(mockFetchFirebaseSocialAuthToken).toHaveBeenCalledTimes(1);
    expect(store.getState().socialAuth.status).toBe("authenticated");
  });
});

describe("retrySocialAuth — concurrency & invalidation", () => {
  it("collapses rapid repeated taps into one in-flight operation", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 401);

    let resolveRefresh: (v: unknown) => void = () => undefined;
    mockEnsureFreshSession.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const first = (store.dispatch as any)(retrySocialAuth());
    const second = (store.dispatch as any)(retrySocialAuth());
    const third = (store.dispatch as any)(retrySocialAuth());

    expect(mockEnsureFreshSession).toHaveBeenCalledTimes(1);

    resolveRefresh(sessionFor("token-B"));
    await Promise.all([first, second, third]);
    expect(store.getState().auth.session?.accessToken).toBe("token-B");
  });

  it("an account change while refreshing invalidates the stale refresh result", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 401);

    let resolveRefresh: (v: unknown) => void = () => undefined;
    mockEnsureFreshSession.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const pending = (store.dispatch as any)(retrySocialAuth());
    (store.dispatch as any)(setSession(sessionFor("token-C", "user-2")));

    resolveRefresh(sessionFor("token-B", "user-1"));
    await pending;

    const state = store.getState();
    expect(state.auth.session?.accessToken).toBe("token-C");
    expect(state.auth.session?.user.uuid).toBe("user-2");
  });

  it("logout while refreshing invalidates pending retry work", async () => {
    const store = makeStore();
    await seedTerminalFailure(store, "token-A", 401);

    let resolveRefresh: (v: unknown) => void = () => undefined;
    mockEnsureFreshSession.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRefresh = resolve;
      }),
    );

    const pending = (store.dispatch as any)(retrySocialAuth());
    (store.dispatch as any)(setSession(null));

    resolveRefresh(sessionFor("token-B"));
    await pending;

    expect(store.getState().auth.session).toBeNull();
  });
});

describe("single ownership — feature hooks never dispatch authentication directly", () => {
  it("no social feature hook calls authenticateFirebaseSocial()", () => {
    const hooksDir = join(__dirname, "..", "hooks");
    const files = [
      "useConversation.ts",
      "useInbox.ts",
      "useNotifications.ts",
      "useSocialSessionGate.ts",
      "useSocialAuthRetry.ts",
    ];
    for (const file of files) {
      const source = readFileSync(join(hooksDir, file), "utf8");
      // A call/dispatch, not a prose mention in a comment.
      expect(source).not.toMatch(/authenticateFirebaseSocial\s*\(/);
    }
  });
});
