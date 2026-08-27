# Masjid OS — Frontend

Expo (React Native) app. Offline-first: the local SQLite database is the source of truth
for every screen; the sync engine owns the network.

Backend: [`backend`](../backend) — separate repository
([ADR-0011](../docs/10-architecture/adr/0011-separate-repositories.md)).
Design documentation: [`docs`](../docs).

## Status

Not yet scaffolded. The Expo app is created in Plan 1B with `create-expo-app`, so that
SDK peer versions come from Expo's own resolver rather than being hand-written.

## Contract

API types are **generated**, never hand-written:

```bash
pnpm contract:sync    # copies ../backend/openapi.json, regenerates src/api/contract.gen.ts
```

`src/api/contract.gen.ts` is committed and CI fails if regenerating it produces a diff.
That check is the only thing standing between this repo and silent type drift — see
[ADR-0011](../mosque/docs/10-architecture/adr/0011-separate-repositories.md).
