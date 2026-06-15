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
} from 'react-native-purchases';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type FC,
  type PropsWithChildren,
} from 'react';
import { Platform } from 'react-native';

import { useAuth } from '../auth/provider';

// ─── constants ───────────────────────────────────────────────────────────────

/**
 * RevenueCat iOS SDK key — injected at build time from EXPO_PUBLIC_REVENUECAT_IOS_KEY.
 * Set this in .env (or as an EAS secret for CI builds).
 */
const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';

/** The entitlement identifier configured in the RevenueCat dashboard. */
export const ENTITLEMENT_PRO = 'MicBoxx Pro';

/** Product identifiers — must match the offering in the RC dashboard. */
export const PRODUCT_YEARLY = 'yearly';
export const PRODUCT_MONTHLY = 'monthly';
export const PRODUCT_VIP_MONTHLY = 'vip_monthly';
export const PRODUCT_VIP_YEARLY = 'vip_yearly';

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

function shouldIgnoreRevenueCatLog(message: string): boolean {
  return message.includes('Purchase was cancelled');
}

function configureRevenueCatLogging(): void {
  Purchases.setLogHandler((level, message) => {
    if (shouldIgnoreRevenueCatLog(message)) {
      return;
    }

    const formattedMessage = `[RevenueCat] ${message}`;
    switch (level) {
      case LOG_LEVEL.DEBUG:
        console.debug(formattedMessage);
        break;
      case LOG_LEVEL.INFO:
        console.info(formattedMessage);
        break;
      case LOG_LEVEL.WARN:
        console.warn(formattedMessage);
        break;
      case LOG_LEVEL.ERROR:
        console.error(formattedMessage);
        break;
      default:
        console.log(formattedMessage);
    }
  });
}

// ─── provider ────────────────────────────────────────────────────────────────

export const SubscriptionProvider: FC<PropsWithChildren> = ({ children }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [currentOffering, setCurrentOffering] = useState<PurchasesOffering | null>(null);
  const [isSdkReady, setIsSdkReady] = useState(false);

  const isConfigured = useRef(false);
  const boundUserUuid = useRef<string | null>(null);

  const { session } = useAuth();
  const sessionUserUuid = session?.user.uuid ?? null;

  // Configure the SDK once on mount.
  useEffect(() => {
    if (isConfigured.current) return;
    isConfigured.current = true;

    async function configure() {
      try {
        if (!REVENUECAT_API_KEY) {
          throw new Error(
            'EXPO_PUBLIC_REVENUECAT_IOS_KEY is not set. Add it to .env before building.',
          );
        }

        if (__DEV__) {
          Purchases.setLogLevel(LOG_LEVEL.DEBUG);
        }

        if (__DEV__) {
          configureRevenueCatLogging();
        }
        Purchases.configure({ apiKey: REVENUECAT_API_KEY });

        // Load current customer info and offerings in parallel.
        // Offerings can fail when products are pending App Store review — handle independently.
        const [info, offeringsResult] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings().catch(() => null),
        ]);

        setCustomerInfo(info);
        setCurrentOffering(offeringsResult?.current ?? null);
      } catch (err) {
        if (__DEV__) {
          console.warn('[RevenueCat] configure failed:', err);
        }
      } finally {
        setIsLoading(false);
        setIsSdkReady(true);
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
      if (typeof listenerResult === 'function') {
        (listenerResult as () => void)();
      } else if (
        listenerResult != null &&
        typeof (listenerResult as { remove?: () => void }).remove === 'function'
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
        console.warn('[RevenueCat] refreshCustomerInfo failed:', err);
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
        console.warn('[RevenueCat] logIn failed:', err);
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
        console.warn('[RevenueCat] logOut failed:', err);
      }
    }
  }, []);

  // Bind the RevenueCat identity to the MicBoxx account. Purchases made while
  // bound restore across devices and stay attributable to the Drupal user UUID
  // (required for server-side entitlement reconciliation). Runs only after
  // `configure` settles so logIn never races SDK initialisation.
  useEffect(() => {
    if (!isSdkReady) return;

    if (sessionUserUuid && boundUserUuid.current !== sessionUserUuid) {
      boundUserUuid.current = sessionUserUuid;
      void loginUser(sessionUserUuid);
    } else if (!sessionUserUuid && boundUserUuid.current) {
      boundUserUuid.current = null;
      void logoutUser();
    }
  }, [isSdkReady, sessionUserUuid, loginUser, logoutUser]);

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
