# MicBoxx Money-Flow Audit — End to End

**Date:** 2026-06-09
**Type:** Discovery document 4 of 5 — evidence-based audit of every revenue rail from payment to creator-visible earnings
**Method:** direct reads of webhook handlers, ledger/payout services, contracts, and the server's own verification scripts. Confidence labels as in the Atlas.

---

## 1. Executive Summary

The platform runs **five revenue rails** on a **two-layer money architecture**: a *commerce layer* (Stripe checkout → webhooks → orders/ledgers → entitlements) that is well-built and idempotent, and a *payout layer* (`micboxx_payouts`: events → balances → settlement → statements → reconciliation) that is equally well-built — **but the bridge between the two layers is the weakest, least-proven link**.

| Rail | Money in | Entitlement/effect | Payout attribution | Verdict |
|---|---|---|---|---|
| Track/album purchase | ✅ Stripe checkout + idempotent webhook | ✅ purchase-access managers | ⚠️ via adapter layer, not directly proven | **Mostly complete** |
| Listener subscription ("Go Pro") | ✅ Stripe subscription checkout | ✅ entitlements resolver | ⚠️ `SubscriptionRevenueAllocator` exists; period reports exist | **Mostly complete** (lifecycle gaps MCBM-90–97) |
| Room support (tips) | ✅ Stripe + wallet, idempotent ledger | ✅ room totals/goal | **❌ no payout event created by the support handler** | **Broken bridge (finding F1)** |
| Music ads (preroll) | ✅ ad events, web playback | n/a | "earnings foundation" per readiness snapshot; not traced here | **Partial** |
| Creator subscription (RevenueCat) | ✅ in-app (mobile) | ⚠️ RC entitlement only | **❌ zero server-side presence (finding F2)** | **Disconnected system** |

**Top findings:**
- **F1 — Support money reaches a ledger, not the payout spine.** `RoomSupportStripeWebhookHandler` completes `room_support_ledger` rows and logs events, but contains **no reference to payouts** (verified by read). If Release Night's promise is "the listening funds you," this bridge must be proven or built.
- **F2 — RevenueCat is invisible to the server.** `grep -rli revenuecat` across all custom modules and `composer.json` returns nothing. "MicBoxx Pro" entitlement lives only in the mobile app + RevenueCat's dashboard; no webhook reconciles it into `fever_core_entitlements`.
- **F3 — Payout-event ingestion goes through a Fever Core adapter layer**, not direct calls: `PayoutEventManager` has **no callers outside `micboxx_payouts`**; the module ships `FeverCorePayoutEventAdapter` plus seven `FeverCorePayout*Client` services, implying events arrive via the Fever Core mirror (`$FEVERCORE_API_URL`). The operational dependency and its failure modes are undocumented. (Medium — inferred from structure.)
- **Positive findings:** webhook signature validation is correct everywhere checked; idempotency is real (checkout handlers persist `idempotency_key = provider_event_id`; support handler guards on ledger status; `PayoutEventManager` uses UUID-as-idempotency-key); a **support wallet** (`user_support_balance`) and **commerce integrity tooling** (`EntitlementGapAuditService`, `EntitlementFactBackfillService`, `CommerceAuthorityReadinessGate`) already exist.

---

## 2. The Commerce Layer (money in → access granted)

### 2.1 One-off purchases (tracks/albums) — verified chain (High)

```
Web checkout UI (apps/web /api/dashboard/commerce/*/checkout-session)
  → Stripe Checkout Session
  → POST webhook → PaymentWebhookController (fever_core_commerce)
       • rejects missing Stripe-Signature; \Stripe\Webhook::constructEvent(payload, sig, secret)  [line 67–73]
  → TrackCheckoutStripeWebhookHandler / AlbumCheckoutStripeWebhookHandler (micboxx_commerce_music)
       • handles checkout.session.completed only; requires payment_status === 'paid'  [lines 37–71]
       • persists with idempotency_key = provider event id  [lines 111, 147]
  → Track/AlbumPurchaseAccessManager → entitlement facts
  → fever_core_entitlements resolver → /v1/dashboard/entitlements → playback gating on all clients
```

Behavioral spec doubles as test evidence: `scripts/verify-micboxx-track-checkout.php`, `verify-micboxx-*-checkout-webhook.php`, `verify-micboxx-fulfillment-adapters.php`, `verify-fever-entitlements-{kernel,resolver}.php`.

Integrity tooling already present (High): `EntitlementGapAuditService` (detects paid-but-not-entitled), `EntitlementFactBackfillService`, `EntitlementMetricsRecorder`, `CommerceAuthorityReadinessGate`, plus `FeverCoreCommerceMirrorClient` (event mirroring, documented in `docs/COMMERCE_MIRROR_ADAPTER.md`). This is unusually mature for the platform's stage.

### 2.2 Listener subscription (High for checkout; gaps known)

Subscription checkout + `SubscriptionCheckoutWebhookHandler` + cancel-at-period-end exist; `FoundingCohortManager` handles early-bird pricing. Known open lifecycle work (dunning, grace, refunds, plan changes) is the team's own MCBM-90–97 range — unchanged by this audit.

### 2.3 Room support (tips) — idempotent intake, then a cliff (High)

```
Client → POST /v1/rooms/{id}/support/send  (methods: direct_stripe | user_support_balance)
  → room_support_ledger row (status: pending)
  → [stripe path] Stripe Checkout → webhook → RoomSupportStripeWebhookHandler
       • resolves ledger by supportLedgerUuid / client_reference_id  [line 62]
       • guard: if status !== 'completed' → mark completed, store session+payment_intent ids  [lines 93–105]
       • logSupportEvent() + logGoalReachedIfNeeded()
  → GET /support/status → totals, backer_count, support_goal_cents
  → creator app revenue features display support totals
  ✗ NO payout event, balance posting, or fee split in this handler (F1)
```

The **wallet rail** (`user_support_balance`, `RoomSupportBalance` with available/reserved/spent) implies a stored-value system; its funding flow (how balance is topped up) was not traced — **Unknown**, flag for follow-up since stored value can carry regulatory weight.

### 2.4 Creator subscription via RevenueCat (High on absence)

Mobile-only: `react-native-purchases` in `micboxx-apps/apps/creator`, entitlement "MicBoxx Pro", paywall UI. Server: **nothing** — no SDK, no webhook route, no entitlement sync. Consequences: web/studio cannot see Pro status; server-gated Pro features are impossible; refunds/billing issues invisible to support tooling. **Recommendation:** RevenueCat webhooks (`INITIAL_PURCHASE`, `RENEWAL`, `CANCELLATION`, `EXPIRATION`) → new endpoint → write entitlement facts into `fever_core_entitlements` keyed by Drupal UUID (RC `app_user_id` should be set to the Drupal UUID — verify in app code). Until then, **declare RevenueCat the source of truth for Pro and document it**; ambiguity is the actual risk.

## 3. The Payout Layer (earnings → money out)

`micboxx_payouts` services (all High, names read from `src/Service/`): `PayoutEventManager` (UUID idempotency, generic `sourceSystem/sourceType/sourceId` schema), `PayoutBalanceManager`, `PayoutEligibilityEvaluator` + `ProfileInspector`, `PayoutSettlementManager` + `PostingManager`, `PayoutBatchManager`, `PayoutStatementManager`, `PayoutReconciliationManager` + `ReportService`, `PayoutAdjustmentManager`, `SubscriptionRevenueAllocator`, `SubscriptionPayoutReadModelService`. Admin reports at `/admin/reports/micboxx-payouts/*`; creator read at `GET /v1/creator/earnings`; manual ops via `fever_intervention_ledger`.

**The structural question (F3):** nothing outside the module calls `PayoutEventManager`, and the module ships `FeverCorePayout*Client` adapters — so payout events appear to be **ingested from the Fever Core side** rather than emitted at transaction time by commerce/support handlers. That makes the Atlas's "payouts implemented, not launched" more precise: *the engine is built; its fuel line runs through an external mirror whose contract, latency, and failure handling are undocumented in this repo.* (Medium.)

**Also missing (Atlas Gap 16, confirmed):** no payout *onboarding* (KYC/bank linking, e.g. Stripe Connect) found anywhere — settlement can compute what's owed, but there is no rail to pay creators out self-serve.

## 4. Break List (ordered by product impact)

| # | Break | Severity | Fix direction |
|---|---|---|---|
| B1 | Support ledger → payout events bridge unproven/absent (F1, F3) | **High** — blocks "listening funds you" claim of Release Night | Either emit a payout event at support completion (`sourceSystem=micboxx`, `sourceType=room_support`, `sourceId=ledger uuid` — idempotent by design) or document+test the Fever Core ingestion path end-to-end |
| B2 | RevenueCat ↔ server reconciliation absent (F2) | **High** | RC webhook → entitlement facts; declare source of truth meanwhile |
| B3 | Payout onboarding (KYC/bank) missing | **High** (pre-payout-launch) | Stripe Connect Express evaluation — separate decision doc |
| B4 | Platform fee policy not found in code for support rail | Medium — fee may be 0% by accident, not decision | Locate/define fee config before marketing support economics (**Unknown** — no fee/share/rate logic found in payout services or support handler) |
| B5 | Wallet (`user_support_balance`) funding & liability model untraced | Medium | Trace top-up flow; assess stored-value implications |
| B6 | Subscription lifecycle completion | Medium (known: MCBM-90–97) | Execute existing Jira range |
| B7 | Ads → earnings linkage untraced in this audit | Low (web-only rail today) | Extend audit when ads become material |

## 5. Recommended Verification Tests (before payout launch)

1. **End-to-end support test:** send support in a test room (both payment methods) → assert `room_support_ledger` completion → assert a payout event exists for the artist → assert balance/statement reflects it. (Extend the existing `verify-micboxx-*` script pattern; none currently covers support→payout.)
2. **Duplicate-webhook replay test:** re-deliver the same Stripe event id to checkout + support webhooks; assert single entitlement/ledger effect (idempotency keys exist — prove they're enforced at the storage layer).
3. **Entitlement gap audit run:** execute `EntitlementGapAuditService` against production-like data; publish results.
4. **Fever Core mirror failure drill:** if B1 resolves via the mirror path, kill the mirror and verify events queue/replay rather than drop.

---

*Cross-references: Atlas §4F (monetization), Gaps 6/7/16; `RELEASE_NIGHT_PRODUCT_SPEC.md` §4 (depends on B1); `SECURITY_SECRETS_AUDIT.md` §5.3 (webhook signatures). Evidence: file/line references read directly 2026-06-09.*
