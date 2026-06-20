import Purchases, { type CustomerInfo } from 'react-native-purchases';
import RevenueCatUI, { PAYWALL_RESULT } from 'react-native-purchases-ui';
import { useCallback } from 'react';

import { ENTITLEMENT_LISTENER, useSubscription } from '@/features/subscription/provider';

// ─── types ───────────────────────────────────────────────────────────────────

export interface PresentPaywallResult {
  purchased: boolean;
  cancelled?: boolean;
  customerInfo: CustomerInfo | null;
}

function isPurchaseCancelledError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: unknown; userCancelled?: unknown };
  return (
    e.code === Purchases.PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR ||
    e.userCancelled === true
  );
}

// ─── paywall ─────────────────────────────────────────────────────────────────

export function usePresentPaywall() {
  const { ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(async (): Promise<PresentPaywallResult> => {
    try {
      await ensureIdentityBound();
      const result = await RevenueCatUI.presentPaywall();
      await refreshCustomerInfo();
      const info = await Purchases.getCustomerInfo();
      return {
        purchased: result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED,
        cancelled: result === PAYWALL_RESULT.CANCELLED,
        customerInfo: info,
      };
    } catch (err) {
      if (isPurchaseCancelledError(err)) {
        return { purchased: false, cancelled: true, customerInfo: null };
      }
      if (__DEV__) console.warn('[RevenueCat] presentPaywall error:', err);
      return { purchased: false, customerInfo: null };
    }
  }, [ensureIdentityBound, refreshCustomerInfo]);
}

export function usePresentPaywallIfNeeded() {
  const { ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(async (): Promise<PresentPaywallResult> => {
    try {
      await ensureIdentityBound();
      const result = await RevenueCatUI.presentPaywallIfNeeded({
        requiredEntitlementIdentifier: ENTITLEMENT_LISTENER,
      });
      await refreshCustomerInfo();
      const info = await Purchases.getCustomerInfo();
      return {
        purchased: result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED,
        cancelled: result === PAYWALL_RESULT.CANCELLED,
        customerInfo: info,
      };
    } catch (err) {
      if (isPurchaseCancelledError(err)) {
        return { purchased: false, cancelled: true, customerInfo: null };
      }
      if (__DEV__) console.warn('[RevenueCat] presentPaywallIfNeeded error:', err);
      return { purchased: false, customerInfo: null };
    }
  }, [ensureIdentityBound, refreshCustomerInfo]);
}

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
            console.warn('[RevenueCat] package not found for storeProductId; presenting paywall:', storeProductId);
          }
          const result = await RevenueCatUI.presentPaywall({ offering: offering ?? undefined });
          await refreshCustomerInfo();
          const info = await Purchases.getCustomerInfo();
          return {
            purchased: result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED,
            cancelled: result === PAYWALL_RESULT.CANCELLED,
            customerInfo: info,
          };
        }

        const { customerInfo: info } = await Purchases.purchasePackage(pkg);
        await refreshCustomerInfo();
        return { purchased: true, customerInfo: info };
      } catch (err) {
        if (isPurchaseCancelledError(err)) {
          return { purchased: false, cancelled: true, customerInfo: null };
        }
        if (__DEV__) console.warn('[RevenueCat] purchasePlan error:', err);
        return { purchased: false, customerInfo: null };
      }
    },
    [currentOffering, ensureIdentityBound, refreshCustomerInfo],
  );
}

// ─── customer center ──────────────────────────────────────────────────────────

export function usePresentCustomerCenter() {
  const { ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(async (): Promise<void> => {
    try {
      await ensureIdentityBound();
      await RevenueCatUI.presentCustomerCenter();
      await refreshCustomerInfo();
    } catch (err) {
      if (__DEV__) console.warn('[RevenueCat] presentCustomerCenter error:', err);
    }
  }, [ensureIdentityBound, refreshCustomerInfo]);
}

// ─── restore ──────────────────────────────────────────────────────────────────

export function useRestorePurchases() {
  const { ensureIdentityBound, refreshCustomerInfo } = useSubscription();

  return useCallback(async (): Promise<boolean> => {
    try {
      await ensureIdentityBound();
      const info = await Purchases.restorePurchases();
      await refreshCustomerInfo();
      return info.entitlements.active[ENTITLEMENT_LISTENER] !== undefined;
    } catch (err) {
      if (__DEV__) console.warn('[RevenueCat] restorePurchases error:', err);
      return false;
    }
  }, [ensureIdentityBound, refreshCustomerInfo]);
}
