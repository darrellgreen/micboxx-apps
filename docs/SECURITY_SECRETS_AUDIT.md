# MicBoxx Security & Secrets Audit

**Date:** 2026-06-09
**Type:** Discovery document 1 of 5 (per `MICBOXX_PLATFORM_ATLAS.md` §12)
**Scope:** Secret storage, git-history exposure, credential handling patterns across `micboxx-apps`, `micboxx-web`, `micboxx-server`
**Method:** Direct git-history verification, full-history gitleaks 8.24.3 scans with manual triage, targeted code reads of credential-handling services. Confidence labels as in the Atlas (High = directly read/executed).

---

## 1. Executive Summary

- **No security incident.** The two originally suspected leaks (Apple `.p8` key, server OAuth keypair) were **disproven by git history** — both are gitignored and have never been committed (§2).
- **One genuine committed secret exists:** AWS SES SMTP credentials in `micboxx-server/config/sync/symfony_mailer.mailer_transport.smtp.yml`. This is the only P0; the remediation runbook is §4.
- **Two new code findings (P1):** the partner API-key HMAC secret and the session secret both fall back silently to hardcoded public constants if their environment variables are unset (§5). In production this would mean partner-key hashes computed with a publicly known secret.
- **Pattern verdict:** the platform's secret handling is structurally good — Stripe keys, S3 credentials, and OAuth client config are all env-driven via the `micboxx.settings.php` overlay; partner API-key secrets are stored hashed, not plaintext; Stripe webhooks validate signatures. The SES credential is an anomaly against the platform's own pattern, not a systemic weakness.
- **Prevention is deployed:** gitleaks CI workflows + triaged allowlists now exist in all three repos (§6).

| Finding | Severity | Action | Owner |
|---|---|---|---|
| SES SMTP credentials committed in config sync | **High (P0)** | Rotate in AWS; env-override; placeholder commit (§4) | Founder/ops (AWS access required) |
| `MICBOXX_KEY_SECRET` silent weak-default fallback | Medium (P1) | Fail fast in production when unset (§5.1) | Eng |
| `MICBOXX_SESSION_SECRET` silent weak-default fallback | Medium (P1) | Same (§5.2) | Eng |
| Private keys stored inside repo working trees (never committed) | Low (P2) | Relocate after confirming tooling paths (§7) | Founder |
| Jira scratch captures at server repo root | Low (P3) | Delete `jira-*.txt/json` | Anyone |

---

## 2. Disproven Findings (for the record)

Automated discovery initially flagged two "committed secrets." Both were re-verified directly and disproven. Full command transcripts are in `MICBOXX_PLATFORM_ATLAS.md` Appendix A; summary:

| Suspected secret | Ignored? | Tracked? | Ever committed? | Verdict |
|---|---|---|---|---|
| `micboxx-apps/SubscriptionKey_M99P97PRF2.p8` (Apple subscription key) | Yes — `.gitignore:11` (`*.p8`) | No | No (`git log --all -- '*.p8'` empty) | **Hygiene only; no rotation** |
| `micboxx-server/keys/private.key`, `public.key` (OAuth keypair) | Yes — `.gitignore:30` (`keys/`) | No | No (`git log --all -- keys/` empty) | **Hygiene only; no rotation** |

**Standing rule (adopted):** discovery agents may flag suspected risks from file presence; a finding is only classified as a *breach* after `git check-ignore -v`, `git ls-files`, and `git log --all -- <path>` prove exposure. Rotation and history purges are responses to proven exposure, not to suspicion.

---

## 3. Full-History Scan Results (gitleaks 8.24.3, 2026-06-09)

Every commit on every ref in all three repos was scanned; all 254 raw hits were manually triaged.

| Repo | Commits scanned | Raw hits | Real | False-positive classes (allowlisted in `.gitleaks.toml`) |
|---|---|---|---|---|
| micboxx-apps | 75 | 3 | 0 | Firebase Android client keys in `google-services.json` (public by design) |
| micboxx-web | 560 | 242 | 0 | `firebase-debug.log` in 2 old commits (expired short-lived OAuth tokens; file now gitignored); PEM-parsing regex in `apps/{web,studio}/src/lib/firebase/firebase-admin.ts` (keys actually come from `process.env`) |
| micboxx-server | 584 | 9 | **1** | SQL schema text (`micboxx_dsp_ingest.install`), placeholder keys in demo docs (`mb_live_mb_invalid.deadbeef` in `docs/PARTNER_INGEST_5MIN_DEMO.md`), e2e fixture password (`scripts/seed-micboxx-paid-gating-fixtures.php`), captured Jira HTTP response with expired XSRF cookie (`jira-headers.txt`) |

**The one real finding:** `config/sync/symfony_mailer.mailer_transport.smtp.yml` contains a live-shaped AWS SES SMTP credential pair — a 20-character `AKIA…` IAM access key ID as `user` and a 44-character SES SMTP password as `pass`, against host `email-smtp.us-west-2.amazonaws.com`. Tracked in git; introduced in a single commit. Deliberately **not** allowlisted, so CI flags it until remediated. (High — file read with values masked; history depth verified.)

---

## 4. P0 Remediation Runbook — SES SMTP Credential

Execute in this order. Steps 1–2 are founder/ops actions requiring AWS console access; this audit does not attempt them.

**Step 1 — Rotate in AWS (closes the actual risk).**
In the AWS console (us-west-2): IAM → Users → locate the SES SMTP user whose access key ID matches the committed `AKIA…` value → deactivate/delete that access key → create new SMTP credentials (SES → SMTP settings → Create SMTP credentials). Until step 3 ships, place the new values in the server environment only.

**Step 2 — Confirm mail still sends** from each environment that uses SES (check `MAILER`/SMTP env wiring per environment; DDEV local falls back per README).

**Step 3 — Move config to environment (matches the platform's existing pattern).**
`micboxx-server/web/sites/default/micboxx.settings.php` already env-drives Stripe (`FEVER_STRIPE_SECRET_KEY`, lines ~114–118) and S3 (`MICBOXX_S3_*`, lines ~76–96) via its `$micboxx_string_env()` helper. Add the same for the mailer:

```php
// SES SMTP credentials — never store in config/sync.
$config['symfony_mailer.mailer_transport.smtp']['configuration']['user']
  = $micboxx_string_env('MICBOXX_SMTP_USER', '');
$config['symfony_mailer.mailer_transport.smtp']['configuration']['pass']
  = $micboxx_string_env('MICBOXX_SMTP_PASS', '');
```

**Step 4 — Neutralize the tracked file.** Re-export config with blank `user`/`pass` values (the overlay now supplies them) and commit. CI gitleaks goes green at HEAD.

**Step 5 (optional) — History purge.** Only one commit touches the file, so `git filter-repo --path config/sync/symfony_mailer.mailer_transport.smtp.yml --invert-paths` (or BFG) is cheap — but **rotation in step 1 already removes the risk**; purge is cosmetic and requires coordinating force-push with all clones. Recommended: do it opportunistically, not urgently.

---

## 5. Code Findings — Credential Handling Patterns

### 5.1 Partner API-key hashing: good design, dangerous fallback (Medium, P1)

`micboxx-server/web/modules/custom/micboxx_dsp_ingest/src/Service/MicBoxxApiKeyService.php` (High — read directly):

- **Good:** partner keys (`mb_live_<key_id>.<secret>`) are stored as HMAC-SHA256 hashes, not plaintext (`hashSecret()`, line ~370); validation compares hashes; rotation/revocation endpoints exist.
- **Finding:** `hashSecret()` reads `getenv('MICBOXX_KEY_SECRET')` and **silently falls back** to the constant `micboxx-default-local-secret-change-in-production` (line 41, used at line 372). If production ever runs without that env var, every partner-key hash is computed with a publicly known (committed) HMAC secret, materially weakening key storage — and nothing alerts.
- **Recommendation:** in production environments, throw/fail-fast when `MICBOXX_KEY_SECRET` is unset (the settings overlay can assert this), or log a critical on boot. Also note: rotating `MICBOXX_KEY_SECRET` invalidates all stored hashes — document that operational coupling before changing it.

### 5.2 Session secret default (Medium, P1)

`micboxx.settings.php:57` uses `$micboxx_string_env('MICBOXX_SESSION_SECRET', 'micboxx-local-session-secret-please-change')` — same silent-fallback pattern. Same recommendation: fail fast outside local/DDEV.

### 5.3 Stripe webhook handling: correct (verified)

`fever_core_commerce/src/Controller/PaymentWebhookController.php:67–73` rejects requests without a `Stripe-Signature` header and verifies payloads with `\Stripe\Webhook::constructEvent($payload, $signature, $webhook_secret)` — the correct, replay-resistant pattern, with the secret env-sourced (`FEVER_STRIPE_WEBHOOK_SECRET`). (High.) Webhook **idempotency** (duplicate event delivery) is out of scope here and is examined in `MONEY_FLOW_AUDIT.md` (doc 4).

### 5.4 Client-side secrets: clean

Mobile apps keep tokens in `expo-secure-store` (Keychain/Keystore); only `EXPO_PUBLIC_*` non-secrets and Firebase client config (public by design) ship in the bundle; RevenueCat/Sentry keys are env-injected, `.env.local` gitignored with complete `.env.example` templates. Web Firebase Admin credentials come from `process.env` (`apps/web/src/lib/firebase/firebase-admin.ts`). (High.)

---

## 6. Prevention Now In Place

- **CI scanning:** `.github/workflows/secret-scan.yml` in all three repos — gitleaks-action v2, full history (`fetch-depth: 0`), on push and PR. *Note:* if the repos are under a GitHub organization, add the free `GITLEAKS_LICENSE` secret; personal repos need nothing.
- **Allowlists:** `.gitleaks.toml` per repo lists only manually triaged false positives, each with a comment explaining why; the SES file is explicitly excluded from the allowlist until remediated.
- **Triage discipline (rule):** new CI findings are never allowlisted without the §2 git-history verification and a comment in `.gitleaks.toml` recording the reason.

## 7. Secret Inventory & Storage Rules

| Secret | Lives where today | Pattern | Action |
|---|---|---|---|
| Stripe secret/webhook keys | Env (`FEVER_STRIPE_*`) | ✅ correct | none |
| S3 credentials | Env (`MICBOXX_S3_*`) | ✅ correct | none |
| SES SMTP user/pass | **`config/sync` (committed)** | ❌ anomaly | §4 runbook |
| OAuth signing keypair | `micboxx-server/keys/` (gitignored files) | ⚠️ in working tree | relocate (below) |
| Apple subscription key `.p8` | `micboxx-apps/` root (gitignored file) | ⚠️ in working tree | relocate (below) |
| Partner API-key HMAC secret | Env (`MICBOXX_KEY_SECRET`) w/ weak fallback | ⚠️ | fail-fast (§5.1) |
| Session secret | Env w/ weak fallback | ⚠️ | fail-fast (§5.2) |
| Firebase Admin SA key (web) | Env (`process.env`) | ✅ | none |
| Mobile runtime secrets | `.env.local` (gitignored) + secure-store | ✅ | none |

**Relocation (P2, deliberate not urgent):** move the `.p8` and `keys/` files outside the working trees (e.g. `~/.config/micboxx/` or a secrets manager) **only after** confirming what references them: EAS/App Store Connect tooling for the `.p8`; Simple OAuth config (`simple_oauth` key paths in Drupal config/env) for the keypair. Until then, the gitignore rules + CI scanning contain the risk.

**Rules going forward:**
1. New secrets enter via the `micboxx.settings.php` env-override pattern (server) or `EXPO_PUBLIC_`-prefixed-only-if-public envs (mobile) — never `config/sync`, never source constants.
2. No weak-default fallbacks for production secrets — unset means fail, not "use the committed constant."
3. Gitleaks findings follow the §2 verification procedure before any allowlist entry.
4. Proven exposure ⇒ rotate first, purge second, document in this file's changelog.

## 8. Open Items (pointers to other documents)

- **Stripe webhook idempotency / event ordering** → `MONEY_FLOW_AUDIT.md` (doc 4).
- **Firestore security rules review** — validation scripts exist (`micboxx-web/apps/web/scripts/validate-firestore-rules.mjs`, `validate-track-comments-rules.mjs`); a rules-content review (especially room moderation write paths and DM access) has not been performed. Candidate doc 6.
- **`MICBOXX_KEY_SECRET` rotation procedure** — needs a documented re-hash/migration story before partner onboarding (`micboxx_dsp_ingest` Phase 2 tables).

---

*Cross-references: `MICBOXX_PLATFORM_ATLAS.md` Appendix A (verification transcripts), Gap 1 (hygiene), Gap 18 (SES credential).*
