# Stack: Expo — Additional Review Checks

Injected IN ADDITION to `reactnative` preset when Expo signals are detected:
- `expo` dependency in `package.json`
- `app.json` / `app.config.js` / `app.config.ts` in the diff
- `expo-*` package imports

Contains Expo-specific checks only. All React Native and React checks also apply.

---

## Aspect 2 — Correctness (additional)

- Expo SDK API used that is deprecated or removed in the declared `sdkVersion` — check the Expo changelog; silent runtime failures or missing modules after upgrade.
- `expo-camera`, `expo-location`, `expo-contacts` etc. used without requesting permissions first — crashes or returns null on first use without the permission request flow.
- `expo-notifications` `addNotificationReceivedListener` / `addNotificationResponseReceivedListener` called without storing the subscription for removal.

---

## Aspect 3 — Possible Breakage (additional)

- OTA update (EAS Update) pushing JS changes that depend on a new native module not yet in the installed binary — managed workflow OTA cannot add native code; requires a new app store build. Changes to `app.json` plugins, new `expo-*` packages with native code, or `expo-modules-core` usage require a full build.
- `expo-file-system` paths hardcoded as absolute — file system paths differ between simulators, devices, and OS versions; always use `FileSystem.documentDirectory` or `FileSystem.cacheDirectory` as a base.
- `Constants.manifest` / `Constants.expoConfig` accessed in bare workflow without checking for null — returns null in bare workflow outside Expo Go.

---

## Aspect 7 — Security (additional)

- Secrets placed in `app.json` `extra` field or `app.config.js` `extra` — the `extra` block is embedded in the app manifest, which is readable from the installed app. Use EAS Secrets or server-side env vars for sensitive values.
- `EXPO_PUBLIC_` prefixed environment variables — like `NEXT_PUBLIC_`, these are bundled into the JS and visible to anyone who extracts the app bundle. Never use this prefix for secrets.
- `expo-web-browser` `openAuthSessionAsync` redirect URL not validated — open redirect if the callback URL is user-controlled.

---

## Aspect 9 — Implication Assessment (additional)

- Adding a new `expo-*` plugin with native code while in managed workflow — requires a new EAS build and app store submission; cannot be delivered via OTA update. Flag this explicitly as a deployment implication.
- `expo-updates` `checkForUpdateAsync` / `fetchUpdateAsync` called on every app launch without a rollback strategy — a bad OTA update can brick the app for all users; ensure a rollback or forced update mechanism is in place.
