/**
 * RevenueCat subscription provider.
 *
 * Initialises the SDK once on mount (uses the Expo/React-Native purchases SDK),
 * then exposes subscription state via `useSubscription()`.
 *
 * Place <SubscriptionProvider> inside <AuthProvider> so the current user's
 * identity is available when we log in to RevenueCat.
 */

import Purchases, {
  type CustomerInfo,
  LOG_LEVEL,
  type PurchasesOffering,
} from "react-native-purchases";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from "react";
import { Platform } from "react-native";

// ─── constants ───────────────────────────────────────────────────────────────

/**
 * RevenueCat API key.
 * The `test_` prefix means this is a sandbox/development key.
 * Replace with a production key (no `test_` prefix) for release builds.
 */
const REVENUECAT_API_KEY = "test_TtAypDoWMGgAjhrfqCHHbTTaLue";

/** The entitlement identifier configured in the RevenueCat dashboard. */
export const ENTITLEMENT_PRO = "MicBoxx Pro";

/** Product identifiers — must match the offering in the RC dashboard. */
export const PRODUCT_YEARLY = "yearly";
export const PRODUCT_MONTHLY = "monthly";

// ─── types ───────────────────────────────────────────────────────────────────

export interface SubscriptionState {
  /** True while the SDK is initialising or fetching customer info. */
  isLoading: boolean;
  /** Whether the current user has an active "MicBoxx Pro" entitlement. */
  isPro: boolean;
  /** The raw RevenueCat CustomerInfo object, or null if not yet loaded. */
  customerInfo: CustomerInfo | null;
  /** The currently active RevenueCat offering (contains available packages). */
  currentOffering: PurchasesOffering | null;
  /** Manually refresh customer info from RevenueCat servers. */
  refreshCustomerInfo: () => Promise<void>;
  /** Log the user in to RevenueCat (call after sign-in with your app user ID). */
  loginUser: (appUserId: string) => Promise<void>;
  /** Log the user out of RevenueCat (call on sign-out). */
  logoutUser: () => Promise<void>;
}

// ─── context ─────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionState>({
  isLoading: true,
  isPro: false,
  customerInfo: null,
  currentOffering: null,
  refreshCustomerInfo: async () => {},
  loginUser: async () => {},
  logoutUser: async () => {},
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function deriveIsPro(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
}

// ─── provider ────────────────────────────────────────────────────────────────

export const SubscriptionProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] =
    useState<PurchasesOffering | null>(null);

  const isConfigured = useRef(false);

  // Configure the SDK once on mount.
  useEffect(() => {
    if (isConfigured.current) return;
    isConfigured.current = true;

    async function configure() {
      try {
        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        // `configure` is the recommended entry point for React Native.
        // It works for both iOS and Android with the same API key in
        // sandbox mode (test_ prefix).
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });

        // Load current customer info and offerings in parallel.
        const [info, offerings] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings(),
        ]);

        setCustomerInfo(info);
        setCurrentOffering(offerings.current);
      } catch (err) {
        if (__DEV__) {
          console.warn("[RevenueCat] configure failed:", err);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void configure();

    // Listen for real-time entitlement changes (e.g. subscription
    // renewed, or restored on another device).
    // The SDK may return a subscription object with `.remove()`, a plain
    // function to call, or void — handle all three defensively.
    const listenerResult = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
    });

    return () => {
      if (typeof listenerResult === "function") {
        (listenerResult as () => void)();
      } else if (
        listenerResult != null &&
        typeof (listenerResult as { remove?: () => void }).remove === "function"
      ) {
        (listenerResult as { remove: () => void }).remove();
      }
    };
  }, []);

  const refreshCustomerInfo = useCallback(async () => {
    try {
      const info = await Purchases.getCustomerInfo();
      setCustomerInfo(info);
    } catch (err) {
      if (__DEV__) {
        console.warn("[RevenueCat] refreshCustomerInfo failed:", err);
      }
    }
  }, []);

  /**
   * Log the RevenueCat user in after your app's own sign-in completes.
   * This links purchases to a stable backend user ID rather than the
   * anonymous RevenueCat ID, enabling cross-device restore.
   */
  const loginUser = useCallback(async (appUserId: string) => {
    try {
      const { customerInfo: info } = await Purchases.logIn(appUserId);
      setCustomerInfo(info);
    } catch (err) {
      if (__DEV__) {
        console.warn("[RevenueCat] logIn failed:", err);
      }
    }
  }, []);

  /**
   * Log the RevenueCat user out when the app user signs out.
   * This reverts to an anonymous RevenueCat identity.
   */
  const logoutUser = useCallback(async () => {
    try {
      const info = await Purchases.logOut();
      setCustomerInfo(info);
    } catch (err) {
      if (__DEV__) {
        console.warn("[RevenueCat] logOut failed:", err);
      }
    }
  }, []);

  const isPro = customerInfo ? deriveIsPro(customerInfo) : false;

  return (
    <SubscriptionContext.Provider
      value={{
        isLoading,
        isPro,
        customerInfo,
        currentOffering,
        refreshCustomerInfo,
        loginUser,
        logoutUser,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
};

// ─── hook ────────────────────────────────────────────────────────────────────

export function useSubscription(): SubscriptionState {
  return useContext(SubscriptionContext);
}
