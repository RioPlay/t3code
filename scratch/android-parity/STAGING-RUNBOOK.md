# Staging Runbook — GATE-M0 (step s09)

Required before step **s10**. Agents prepare; humans execute secrets and device verification.

---

## Prerequisites checklist

- [ ] Steps s01–s08 merged on fork `main`
- [ ] Staging Postgres reachable (PlanetScale branch or dev DB)
- [ ] Clerk staging app matches mobile dev variant

---

## 1. Relay staging deploy

```bash
# Manual workflow (after s01 lands deploy-relay-staging.yml)
gh workflow run deploy-relay-staging.yml
```

Or local:

```bash
cd infra/relay
# Set staging env vars — see infra/relay/.env.example
RELAY_FCM_DELIVERY_ENABLED=false bun run deploy:staging  # if script exists; else document URL
```

**Required env (relay worker):**

| Var                          | Purpose                    |
| ---------------------------- | -------------------------- |
| `FCM_PROJECT_ID`             | Firebase project           |
| `FCM_SERVICE_ACCOUNT_JSON`   | Redacted secret — FCM send |
| `RELAY_FCM_DELIVERY_ENABLED` | `false` until §4           |

Apply migration from s03 before enabling delivery.

---

## 2. Firebase (mobile)

See `apps/mobile/docs/FIREBASE-ANDROID.md`.

Human:

1. Create Firebase Android app for `com.t3tools.t3code.dev`
2. Upload `google-services.json` to EAS secret `GOOGLE_SERVICES_JSON`
3. Rebuild dev client: `cd apps/mobile && vp run android:dev`

---

## 3. Enable FCM on staging

1. Set `RELAY_FCM_DELIVERY_ENABLED=true` on staging worker
2. Redeploy relay
3. Verify `infra/relay` health

---

## 4. Device E2E (human)

1. Install dev client on physical Android device
2. `T3CODE_RELAY_URL=<staging>` + Clerk dev keys in `.env.local`
3. Sign in, link environment, grant notifications
4. Trigger `waiting_for_approval` via relay admin or `seed-relay-push.sh`
5. Confirm push received → tap → correct thread (cold start)

---

## 5. Sign off

1. Complete `signoff-GATE-M0.adoc`
2. Mark `smoke-matrix.adoc` §M0 rows PASS
3. Set `loop-state.json`:

```json
"gates": { "m0_staging": "pass" }
```

4. Reply to agent: **gate pass**

---

## Rollback

Set `RELAY_FCM_DELIVERY_ENABLED=false`. iOS APNs path unchanged.

---

## seed-relay-push.sh (after s14)

```bash
RELAY_STAGING_URL=https://... \
RELAY_TEST_DEVICE_ID=... \
apps/mobile/.maestro/scripts/seed-relay-push.sh
```

Fails with instructions if env unset — intentional.
