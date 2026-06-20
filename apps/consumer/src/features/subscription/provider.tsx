/**
 * RevenueCat subscription provider for the consumer (listener) app.
 *
 * Initialises the SDK once on mount, then exposes subscription state
 * via `useSubscription()`.
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

import { useAuth } from '@/features/auth/provider';

// ─── constants ───────────────────────────────────────────────────────────────

const REVENUECAT_API_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '';
export const OFFERING_IDENTIFIER = 'micboxx_premium';

export const ENTITLEMENT_LISTENER = 'MicBoxx Premium';

/** App Store / RevenueCat product identifiers for listener plans. */
export const PRODUCT_PREMIUM_MONTHLY = 'premium_monthly';
export const PRODUCT_PREMIUM_ANNUAL = 'premium_annual';

// ─── types ───────────────────────────────────────────────────────────────────

export interface SubscriptionState {
  isLoading: boolean;
  isSubscriber: boolean;
  customerInfo: CustomerInfo | null;
  currentOffering: PurchasesOffering | null;
  isSdkReady: boolean;
  isIdentityBound: boolean;
  refreshCustomerInfo: () => Promise<void>;
  ensureIdentityBound: () => Promise<void>;
  loginUser: (appUserId: string) => Promise<void>;
  logoutUser: () => Promise<void>;
}

// ─── context ─────────────────────────────────────────────────────────────────

const SubscriptionContext = createContext<SubscriptionState>({
  isLoading: true,
  isSubscriber: false,
  customerInfo: null,
  currentOffering: null,
  isSdkReady: false,
  isIdentityBound: false,
  refreshCustomerInfo: async () => {},
  ensureIdentityBound: async () => {},
  loginUser: async () => {},
  logoutUser: async () => {},
});

// ─── helpers ─────────────────────────────────────────────────────────────────

function deriveIsSubscriber(info: CustomerInfo): boolean {
  return info.entitlements.active[ENTITLEMENT_LISTENER] !== undefined;
}

function shouldIgnoreRevenueCatLog(message: string): boolean {
  return message.includes('Purchase was cancelled');
}

function configureRevenueCatLogging(): void {
  Purchases.setLogHandler((level, message) => {
    if (shouldIgnoreRevenueCatLog(message)) return;
    const formattedMessage = `[RevenueCat] ${message}`;
    switch (level) {
      case LOG_LEVEL.DEBUG: console.debug(formattedMessage); break;
      case LOG_LEVEL.INFO:  console.info(formattedMessage);  break;
      case LOG_LEVEL.WARN:  console.warn(formattedMessage);  break;
      case LOG_LEVEL.ERROR: console.error(formattedMessage); break;
      default:              console.log(formattedMessage);
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
  const isIdentityBound =
    Boolean(sessionUserUuid) && boundUserUuid.current === sessionUserUuid;

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
          configureRevenueCatLogging();
        }

        Purchases.configure({ apiKey: REVENUECAT_API_KEY });

        const [info, offeringsResult] = await Promise.all([
          Purchases.getCustomerInfo(),
          Purchases.getOfferings().catch(() => null),
        ]);

        setCustomerInfo(info);
        setCurrentOffering(
          offeringsResult?.all[OFFERING_IDENTIFIER] ?? offeringsResult?.current ?? null,
        );
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

  const loginUser = useCallback(async (appUserId: string) => {
    try {
      const { customerInfo: info } = await Purchases.logIn(appUserId);
      boundUserUuid.current = appUserId;
      setCustomerInfo(info);
    } catch (err) {
      if (__DEV__) {
        console.warn('[RevenueCat] logIn failed:', err);
      }
    }
  }, []);

  const logoutUser = useCallback(async () => {
    try {
      const info = await Purchases.logOut();
      boundUserUuid.current = null;
      setCustomerInfo(info);
    } catch (err) {
      if (__DEV__) {
        console.warn('[RevenueCat] logOut failed:', err);
      }
    }
  }, []);

  const ensureIdentityBound = useCallback(async () => {
    if (!isSdkReady) {
      throw new Error('RevenueCat is still starting. Try again in a moment.');
    }
    if (!sessionUserUuid) {
      throw new Error('Sign in before starting a purchase.');
    }
    if (boundUserUuid.current === sessionUserUuid) return;
    await loginUser(sessionUserUuid);
  }, [isSdkReady, loginUser, sessionUserUuid]);

  useEffect(() => {
    if (!isSdkReady) return;
    if (sessionUserUuid && boundUserUuid.current !== sessionUserUuid) {
      void loginUser(sessionUserUuid);
    } else if (!sessionUserUuid && boundUserUuid.current) {
      void logoutUser();
    }
  }, [isSdkReady, sessionUserUuid, loginUser, logoutUser]);

  const isSubscriber = customerInfo ? deriveIsSubscriber(customerInfo) : false;

  return (
    <SubscriptionContext.Provider
      value={{
        isLoading,
        isSubscriber,
        customerInfo,
        currentOffering,
        isSdkReady,
        isIdentityBound,
        refreshCustomerInfo,
        ensureIdentityBound,
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
