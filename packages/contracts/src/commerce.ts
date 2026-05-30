// Commerce contract types.
//
// Mirrors the shapes defined in `micboxx-web/src/lib/micboxx-commerce.ts`.
// These are the payloads returned by `/v1/dashboard/commerce/*` and
// `/v1/public/commerce/*` endpoints on Drupal.
//
// Money is transmitted as decimal strings ("9.99", not 9.99). Do not
// coerce to Number — parse with a decimal library or format the string
// directly. Timestamps are Unix seconds (number) on commerce payloads,
// not ISO strings — this is a deliberate difference from the rest of the
// public catalog surface.

export interface CommerceProviderState {
  name: string;
  enabled: boolean;
  checkoutReady: boolean;
  sessionMode: string;
  reason: string | null;
}

export interface CommerceOrderPayload {
  id: number | null;
  uuid: string;
  status: string;
  currency: string;
  totals: {
    subtotal: string;
    discountTotal: string;
    taxTotal: string;
    feeTotal: string;
    grandTotal: string;
  };
  provider: {
    name: string;
    reference: string;
  };
  idempotencyKey: string;
  timestamps: {
    createdAt: number;
    quotedAt: number;
    finalizedAt: number;
    paidAt: number;
    fulfilledAt: number;
  };
}

export interface CommerceOrderLinePayload {
  id: number | null;
  uuid: string;
  sellableKey: string;
  sellableType: string;
  sellableId: string;
  sellableUuid: string;
  fulfillmentAdapter: string;
  quantity: number;
  currency: string;
  unitPrice: string;
  lineSubtotal: string;
  discountTotal: string;
  lineTotal: string;
  snapshotTitle: string;
  snapshotSku: string;
}

export interface CommerceOrderHistoryEntry extends CommerceOrderPayload {
  lines: CommerceOrderLinePayload[];
}

export interface CommerceSellablePayload {
  key: string;
  type: string;
  id: string | number;
  uuid: string;
  sku: string;
  title: string;
  currency: string;
  unitAmount: string;
  quantityMode: string;
  fulfillmentAdapter: string;
  sellerAccountId: string | null;
  metadata: Record<string, unknown>;
}

export interface CommerceCheckoutSessionPayload {
  id: string;
  url: string;
  status: string;
  paymentStatus: string;
  mode: string;
  subscriptionReference?: string;
  customerReference?: string;
}

export interface TrackCheckoutSessionResponse {
  mode: "track_single";
  reused: boolean;
  order: CommerceOrderPayload;
  line: CommerceOrderLinePayload;
  sellable: CommerceSellablePayload;
  provider: CommerceProviderState;
  session: CommerceCheckoutSessionPayload;
}

export interface AlbumCheckoutSessionResponse {
  mode: "album_single";
  reused: boolean;
  order: CommerceOrderPayload;
  line: CommerceOrderLinePayload;
  sellable: CommerceSellablePayload;
  provider: CommerceProviderState;
  session: CommerceCheckoutSessionPayload;
}

export interface SubscriptionCheckoutSessionResponse {
  mode: "subscription_single";
  reused: boolean;
  order: CommerceOrderPayload;
  line: CommerceOrderLinePayload;
  sellable: CommerceSellablePayload;
  provider: CommerceProviderState;
  session: CommerceCheckoutSessionPayload;
}

export interface TrackPurchaseAccessState {
  hasAccess: boolean;
  source: string | null;
  orderId: number | null;
  orderLineId: number | null;
  grantedAt: number | null;
}

export interface AlbumPurchaseAccessState {
  hasAccess: boolean;
  source: string | null;
  orderId: number | null;
  orderLineId: number | null;
  grantedAt: number | null;
}

export interface EntitlementCapabilityDetail {
  key: string;
  label: string;
  shortLabel: string;
  description: string;
  group: string;
  sortOrder: number;
}

export interface PublicSubscriptionPlan {
  uuid: string;
  machineKey: string;
  label: string;
  amount: number | null;
  currency: string;
  billingIntervalUnit: string;
  billingIntervalCount: number;
  trialPeriodDays: number;
  capabilities: string[];
  capabilityDetails?: EntitlementCapabilityDetail[];
}

export interface EntitlementPlanState {
  id: number | string;
  uuid: string;
  machineKey: string;
  label: string;
  providerName: string;
  providerPlanReference: string;
  amount: number | null;
  currency: string;
  billingIntervalUnit: string;
  billingIntervalCount: number;
  trialPeriodDays: number;
  metadata: Record<string, unknown>;
  capabilityDetails?: EntitlementCapabilityDetail[];
}

export interface EntitlementPeriodState {
  startedAt: number | null;
  currentPeriodStartsAt: number | null;
  currentPeriodEndsAt: number | null;
  trialEndsAt: number | null;
  graceEndsAt: number | null;
  pausedAt: number | null;
  canceledAt: number | null;
  expiresAt: number | null;
}

export interface EntitlementState {
  schemaVersion: number;
  source: {
    entityType: string;
    subscriptionId: number;
    subscriptionUuid: string;
    planId: number | string;
    planUuid: string;
    planMachineKey: string;
  };
  plan: EntitlementPlanState;
  status: string;
  capabilities: string[];
  period: EntitlementPeriodState;
  verification: {
    resolvedAt: number | null;
    lastVerifiedAt: number | null;
  };
  external: {
    providerName: string | null;
    providerCustomerReference: string | null;
    providerSubscriptionReference: string | null;
    providerPlanReference: string | null;
    externalReference: string | null;
  };
}

/**
 * Request body accepted by the track/album/subscription checkout-session
 * endpoints. `successUrl` and `cancelUrl` are Stripe-side return URLs;
 * mobile typically points these at `micboxx://checkout/success` and
 * `micboxx://checkout/cancel` deep links handled by `expo-linking`.
 *
 * Pass a stable `idempotencyKey` (UUID v4) per checkout attempt and reuse
 * it across retries so the server de-duplicates rather than creating a
 * duplicate order.
 */
export interface CreateCheckoutSessionRequest {
  successUrl: string;
  cancelUrl: string;
  idempotencyKey?: string;
}
