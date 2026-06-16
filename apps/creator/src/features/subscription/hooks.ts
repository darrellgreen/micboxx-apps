/**
 * Subscription action hooks — paywall presentation, Customer Center,
 * purchase restoration, and entitlement helpers.
 */

import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useCallback } from 'react';

import { ENTITLEMENT_PRO, useSubscription } from '@/features/subscription/provider';

// ─── paywall ─────────────────────────────────────────────────────────────────

export interface PresentPaywallResult {
  /** Whether the user completed a purchase or restored an active subscription. */
  purchased: boolean;
  /** Whether the user intentionally dismissed/cancelled the purchase flow. */
  cancelled?: boolean;
  /** The updated CustomerInfo after the paywall was dismissed (may be null on error). */
  customerInfo: CustomerInfo | null;
}

function isPurchaseCancelledError(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }

  const purchasesError = err as {
    code?: unknown;
    userCancelled?: unknown;
  };

  return (
    purchasesError.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    purchasesError.userCancelled === true
  );
}

/**
 * Returns a function that presents the RevenueCat paywall sheet.
 *
 * Usage:
 *   const presentPaywall = usePresentPaywall();
 *   const result = await presentPaywall();
 *   if (result.purchased) { // user is now Pro }
 */
export function usePresentPaywall() {
  const { ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(async (): Promise<PresentPaywallResult> => {
    try {
      await ensureIdentityBound();
      const result = await RevenueCatUI.presentPaywall();

      // Refresh customer info so the provider's isPro flag updates immediately.
      await refreshCustomerInfo();

      const info = await Purchases.getCustomerInfo();
      const purchased = result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
      const cancelled = result === PAYWALL_RESULT.CANCELLED;

      return { purchased, cancelled, customerInfo: info };
    } catch (err) {
      if (isPurchaseCancelledError(err)) {
        return { purchased: false, cancelled: true, customerInfo: null };
      }
      if (__DEV__) {
        console.warn('[RevenueCat] presentPaywall error:', err);
      }
      return { purchased: false, customerInfo: null };
    }
  }, [ensureIdentityBound, refreshCustomerInfo]);
}

/**
 * Returns a function that presents the paywall only if the user does NOT
 * already have an active Pro entitlement.
 *
 * Usage:
 *   const presentPaywallIfNeeded = usePresentPaywallIfNeeded();
 *   const result = await presentPaywallIfNeeded();
 */
export function usePresentPaywallIfNeeded() {
  const { ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(async (): Promise<PresentPaywallResult> => {
    try {
      await ensureIdentityBound();
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_PRO,
      });

      await refreshCustomerInfo();

      const info = await Purchases.getCustomerInfo();
      const purchased = result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
      const cancelled = result === PAYWALL_RESULT.CANCELLED;

      return { purchased, cancelled, customerInfo: info };
    } catch (err) {
      if (isPurchaseCancelledError(err)) {
        return { purchased: false, cancelled: true, customerInfo: null };
      }
      if (__DEV__) {
        console.warn('[RevenueCat] presentPaywallIfNeeded error:', err);
      }
      return { purchased: false, customerInfo: null };
    }
  }, [ensureIdentityBound, refreshCustomerInfo]);
}

/**
 * Returns a function that purchases a specific plan by its App Store product ID.
 * Falls back to the generic paywall if the product is not found in the current offering.
 *
 * Usage:
 *   const purchasePlan = usePurchasePlan();
 *   const result = await purchasePlan("monthly");
 */
export function usePurchasePlan() {
  const { currentOffering, ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(
    async (storeProductId: string): Promise<PresentPaywallResult> => {
      try {
        await ensureIdentityBound();
        const offering = currentOffering ?? (await Purchases.getOfferings()).current ?? null;
        const pkg = offering?.availablePackages.find(
          (p) => p.product?.identifier === storeProductId || p.identifier === storeProductId,
        );

        if (!pkg) {
          if (__DEV__) {
            console.warn(
              '[RevenueCat] package not found for storeProductId; presenting paywall:',
              storeProductId,
            );
          }
          const result = await RevenueCatUI.presentPaywall({
            offering: offering ?? undefined,
          });
          await refreshCustomerInfo();
          const info = await Purchases.getCustomerInfo();
          return {
            purchased: result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED,
            customerInfo: info,
            cancelled: result === PAYWALL_RESULT.CANCELLED,
          };
        }

        const { customerInfo: info } = await Purchases.purchasePackage(pkg);
        await refreshCustomerInfo();
        return { purchased: true, customerInfo: info };
      } catch (err) {
        if (isPurchaseCancelledError(err)) {
          return { purchased: false, cancelled: true, customerInfo: null };
        }
        if (__DEV__) {
          console.warn('[RevenueCat] purchasePlan error:', err);
        }
        return { purchased: false, customerInfo: null };
      }
    },
    [currentOffering, ensureIdentityBound, refreshCustomerInfo],
  );
}

// ─── customer center ──────────────────────────────────────────────────────────

/**
 * Returns a function that presents the RevenueCat Customer Center sheet.
 * Customer Center allows users to manage their subscription, restore
 * purchases, and contact support — all without leaving the app.
 *
 * Usage:
 *   const presentCustomerCenter = usePresentCustomerCenter();
 *   await presentCustomerCenter();
 */
export function usePresentCustomerCenter() {
  const { ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(async (): Promise<void> => {
    try {
      await ensureIdentityBound();
      await RevenueCatUI.presentCustomerCenter();
      // Refresh after dismissal in case the user restored or cancelled.
      await refreshCustomerInfo();
    } catch (err) {
      if (__DEV__) {
        console.warn('[RevenueCat] presentCustomerCenter error:', err);
      }
    }
  }, [ensureIdentityBound, refreshCustomerInfo]);
}

// ─── restore ──────────────────────────────────────────────────────────────────

/**
 * Returns a function that restores purchases from the App Store / Play Store.
 * Useful as a manual "Restore Purchases" button in settings.
 *
 * Usage:
 *   const restorePurchases = useRestorePurchases();
 *   const isPro = await restorePurchases();
 */
export function useRestorePurchases() {
  const { ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(async (): Promise<boolean> => {
    try {
      await ensureIdentityBound();
      const info = await Purchases.restorePurchases();
      await refreshCustomerInfo();
      return info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
    } catch (err) {
      if (__DEV__) {
        console.warn('[RevenueCat] restorePurchases error:', err);
      }
      return false;
    }
  }, [ensureIdentityBound, refreshCustomerInfo]);
}
