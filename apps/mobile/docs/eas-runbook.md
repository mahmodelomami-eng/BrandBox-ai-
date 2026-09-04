# EAS / Mobile Release Runbook

## Goal
Produce repeatable preview/release builds without leaking credentials or confusing build success with product readiness.

## Before changing build config
- inspect `app.json`, `eas.json`, package versions and mobile CI;
- identify target profile (development/preview/production);
- distinguish public Expo variables from server-only secrets;
- do not create/rotate signing credentials or paid account resources autonomously.

## Verification order
1. install dependencies with the repository-supported Node/npm versions;
2. run Expo dependency health check;
3. run `npm run typecheck` in `apps/mobile`;
4. run root mobile guards;
5. require green `mobile-ci`;
6. for preview/release changes, verify EAS build status and artifact install/start behavior when the environment permits it.

## Environment rules
`EXPO_PUBLIC_*` values are public by design. They must never contain service-role keys, private API keys, signing secrets, provider client secrets or payment secrets. Server-only variables stay on the server/authorized build platform.

## Failure triage
- dependency mismatch → inspect Expo doctor/version compatibility;
- app boots then closes → inspect startup provider/session/config assumptions before rebuilding blindly;
- network/auth failure → distinguish API URL/public config from server outage/session lifecycle;
- build credential/account prompt → owner/platform escalation, not a code workaround.

## Release evidence
Record commit SHA, EAS profile, CI result, build result, app startup result, known external blockers and rollback/recovery path.
