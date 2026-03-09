# Stack: React Native — Additional Review Checks

Injected into Phase 4 aspects when React Native signals are detected in the diff:
- `react-native` dependency in `package.json`
- `.native.ts` / `.native.tsx` / `.native.js` platform-specific files
- Paths containing `android/` or `ios/` Java/Kotlin/Swift/ObjC files alongside JS/TS

When Expo signals are also present (`expo` in `package.json`, `app.json`, `app.config.js`),
the `expo` preset is loaded IN ADDITION to this one.

React Native inherits all `react` checks. Apply these IN ADDITION to `react.md` and the universal checklist.

---

## Aspect 2 — Correctness (additional)

- `FlatList` / `SectionList` missing `keyExtractor` — React Native uses it for reconciliation and scroll position restoration; without it, list re-renders are incorrect.
- `renderItem` in `FlatList` not wrapped in `useCallback` — creates a new function reference on every parent render, causing all list items to re-render regardless of data changes.
- `Platform.OS` check used where `Platform.select` or platform-specific file (`.ios.tsx` / `.android.tsx`) would be clearer and more maintainable.
- `Dimensions.get('window')` called once at module level — does not update on orientation change or window resize (foldables, tablets); use `useWindowDimensions()` hook or subscribe to `Dimensions.addEventListener`.

---

## Aspect 3 — Possible Breakage (additional)

- `AppState`, `BackHandler`, `Keyboard`, `Linking` event listeners added without removal in a cleanup function / `useEffect` return — duplicate handlers accumulate across navigations and cause memory leaks.
- Navigation `navigate()` or `goBack()` called after the component is unmounted (e.g., in an async callback after a network request) — `setState on unmounted component` warning and potential crash.
- `InteractionManager.runAfterInteractions()` callbacks not cancelled on unmount — runs after the component is gone.
- Deep linking / universal link handler not guarded — unvalidated route parameters passed directly to navigation can cause crashes on unexpected input.

---

## Aspect 7 — Security (additional)

- Sensitive data (tokens, passwords, PII) stored in `AsyncStorage` — stores plain text on-disk, readable by other apps on rooted/jailbroken devices. Use `expo-secure-store` (Expo) or `react-native-keychain` (bare).
- API keys or secrets hardcoded in JS source — React Native bundles are extractable from APK/IPA; use environment variables (via `react-native-config` or Expo's `app.config.js`) and never embed secrets in the bundle.
- Deep link URL parameters used without validation — user or attacker-controlled URLs should be validated before use in navigation or API calls.
- `WebView` with `javaScriptEnabled` + `onMessage` / `postMessage` handling user-controlled URLs — XSS in the WebView can exfiltrate data via the bridge.

---

## Aspect 9 — Implication Assessment (additional)

- `StyleSheet.create()` vs inline style objects — inline styles create new objects on every render; `StyleSheet.create()` optimizes by sending IDs over the bridge. Use `StyleSheet.create()` for static styles.
- JavaScript thread blocked by heavy computation — RN has a single JS thread; synchronous CPU work (large JSON parse, sorting, image processing) causes frame drops. Offload to a worker or native module.
- `console.log` in production builds — each log crosses the JS bridge and has measurable overhead; ensure logs are stripped in production (Babel plugin or conditional).

---

## Aspect 12 — Architecture & Design (additional)

- Business logic in screen components — extract to hooks, stores (Zustand, Redux, MobX), or service modules; screens should handle rendering and navigation only.
- Platform-specific code scattered via `if (Platform.OS === 'ios')` throughout business logic — consolidate platform differences in a single abstraction layer or platform-specific files.
- Missing error boundary around screens loaded via deep link or navigation — a crash in one screen should not bring down the entire navigator stack.
