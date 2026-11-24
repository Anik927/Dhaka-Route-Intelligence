# Dhaka Route Intelligence — agent notes

Expo SDK 54 (`expo ~54.0.36`, Router 6, React 19, RN 0.81), npm project (`package-lock.json`, no `bun.lock`). `README.md` is the untouched `create-expo-app` starter — it documents nothing about this app. Before using Expo/EAS/RN APIs, check the matching docs at `https://docs.expo.dev/versions/v54.0.0/` instead of recalling APIs.

## Commands & verification
- `npm install`, `npx expo start` (`--web`, `--android`, `--ios` variants exist). Use `npx expo install <pkg>` to add dependencies so versions match SDK 54.
- `npm run lint` is the only configured script for checks. **There is no test runner or test script** — also run `npx tsc --noEmit` manually (typecheck is not scripted). `jest` appears in the lockfile only as a transitive dep.
- Never run `npm run reset-project`: it deletes/moves `app/`, `components/`, `hooks/`, `constants/`, `scripts/` and writes a blank app.
- No `ios/`/`android/` directories (CNG) — native config lives in `app.json` + config plugins. No `eas.json` or CI workflows exist yet; builds go through `npx eas-cli@latest ...`.

## Structure
- Routes are in repo-root `app/`, **not** `src/app/`. `(auth)` and `(tabs)` are route groups. `app/_layout.tsx` wraps everything in `AuthProvider` and shows a spinner until AsyncStorage session restore finishes; `app/index.tsx` redirects to `/(tabs)` or `/(auth)/login`.
- `typedRoutes` is enabled in `app.json` — use real route paths in `href`/`router.push` or typecheck fails. Pass params as objects: `router.push({ pathname: "/report-detail/[id]", params: { id } })`. Import `Link`, `router`, `useLocalSearchParams` from `expo-router`.
- React Compiler is enabled (`app.json` experiments) — don't add manual `useMemo`/`useCallback` for perf by default.
- Non-route code lives in `services/`, `context/`, `components/`, `constants/`, `utils/`, `hooks/`. Import via the `@/*` alias (tsconfig maps it to repo root).

## Data layer & demo behaviour
- **No backend**: all state is local AsyncStorage under `@dhaka_route_*` keys (`users`, `session`, `reports`, `votes`, `moderation`, `suspensions`, `audit`, `saved_routes`, `seed_m4`). `services/*` is the data layer; keep the key prefix for new storage.
- `@dhaka_route_users` is shared by `services/authService.ts` and `services/moderationUserStore.ts`. Both hand-duplicate the stored shape (`DemoUser + password`); changing the key or shape requires updating both.
- Demo accounts are hardcoded in `authService.ts`: `student@` / `moderator@` / `admin@dhakaroute.com`, password `12345678` (also used for seeded users). Auth is local-only demo auth, not real credentials.
- To exercise moderation flows, `services/seedService.ts` `seedDemoData(actor)` creates 4 users, 5 reports, spam votes and a suspension. It is idempotent via the `@dhaka_route_seed_m4` flag — clear app storage to re-seed.
- Role checks happen in two places: `href: null` in `app/(tabs)/_layout.tsx` only hides tabs from the bar (URLs still work), while `components/auth/RoleGuard.tsx` redirects unauthenticated users and shows "Access Denied" on role mismatch. Every existing privileged screen wraps its content in `RoleGuard` — do the same for new ones.

## Testing quirks
- No Jest/Vitest config or test files. `scripts/async-storage-shim.ts` is an in-memory AsyncStorage shim intended for ad-hoc headless checks of service logic; there is no documented runner for it.
