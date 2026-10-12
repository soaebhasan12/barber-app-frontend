# BarberBook Frontend Review

## Pass 0 — Inventory & config

Scope reviewed:
- package.json
- app.json
- eas.json
- android/app/src/main/AndroidManifest.xml
- android/gradle.properties
- android/app/proguard-rules.pro
- App.js
- index.js
- .easignore
- README.md
- AGENTS.md
- CLAUDE.md

### FE-001 · Missing Android Firebase config
- Severity: P1 (broken flow, likely in production)
- Category: L Release readiness
- File: app.json · Function/Component: expo.android
- Find anchor: `"googleServicesFile": "./google-services.json"`
- Problem: The app declares a Firebase Android config file in `app.json`, but the repository tree does not include `google-services.json` and the build configuration does not show a replacement path or secret binding. In a React Native + Expo build, Android push notifications and Firebase services will fail to initialize if this file is absent or not injected during EAS build.
- Failure scenario: A release build is generated for Play; Firebase initialization fails because `google-services.json` is missing, so FCM registration and notification delivery break. The app may still install, but push-notification flows silently stop and the login/booking notification path is unusable.
- Suggested fix: Commit a valid `google-services.json` for the Android app or inject it via EAS secret/config during build, and keep the repo path in sync with the project package name (`com.barberbook.app`). If the file is intentionally excluded, remove the declaration and handle Firebase setup in the build pipeline instead of relying on a missing local file.
- Needs backend change? no — build-time Firebase config only
- Effort: S (<30 min)
- Confidence: High

### FE-002 · Release docs and app metadata are stale and inconsistent
- Severity: P3 (nice-to-have)
- Category: L Release readiness
- File: README.md · Function/Component: project docs
- Find anchor: `React Native + Expo SDK 53`
- Problem: The README advertises Expo SDK 53, but `package.json` declares `"expo": "^57.0.16"` and `react-native`: `0.86.2`. This version mismatch is misleading for onboarding, support, and release engineering and suggests the documentation was not updated when the app changed versions. It also weakens confidence in the documented build instructions and compatibility expectations.
- Failure scenario: A developer follows the README instructions for an Expo 53 setup, then installs dependencies based on stale metadata, leading to an incompatible dev-client or config drift. The build may work only by accident or fail when trying to follow the documented steps.
- Suggested fix: Update the README to match the actual Expo SDK and React Native versions in `package.json`, and ensure the installation/build steps are validated against the live app config before release documentation is published.
- Needs backend change? no — documentation only
- Effort: S (<30 min)
- Confidence: High

### Checked: OK list
- Checked: OK — `package.json` uses the expected Expo/React Native dependency set for a bare Android app and does not include obviously stray frontend-only packages outside the intended stack.
- Checked: OK — `.easignore` is standard for EAS builds and correctly excludes large local build artifacts like `node_modules`, `.git`, and `.expo`.
- Checked: OK — `android/gradle.properties` enables the modern AndroidX + Hermes setup expected by a current Expo/React Native project, and `edgeToEdgeEnabled=true` is present for Android UI parity.
- Checked: OK — the app shell is minimal and conventional: `App.js` wraps the app in `AuthProvider`, `index.js` registers the root component, and `android/app/src/main/AndroidManifest.xml` defines the expected launcher and Expo notification metadata.

### Notes for the next pass
- Pass 0 found one release blocker (Android Firebase config) and one documentation mismatch.
- Next up: Pass 1 will review the core services (`src/services/api.js`, `src/context/AuthContext.js`, `src/services/notifications.js`) for auth, token persistence, and notification security.

## Pass 1 — Core services

### FE-003 · FCM registration runs before auth and for logged-out users
- Severity: P1 (broken flow, likely in production)
- Category: A Security & privacy
- File: App.js · Function/Component: App
- Find anchor: `registerForPushNotificationsAsync();`
- Problem: `App.js` invokes `registerForPushNotificationsAsync()` unconditionally on launch, even before a valid authenticated session exists. The same function is also called in `AuthContext.checkLogin()` after restoring a saved session, but there is no guard to ensure the push token is only registered for a user who is currently authenticated. This can associate device push tokens with a stale or nonexistent user state and leak notifications to the wrong account.
- Failure scenario: A user installs the app, opens it while logged out, and the app requests notification permission and sends a token to the backend without any valid auth context. Later, another user logs in on the same device or the token is reused for a prior session, causing booking notifications to be delivered to the wrong account or to a stale session, which is both a privacy and trust issue.
- Suggested fix: Register FCM only after a verified user session exists, e.g. `if (user && token) registerForPushNotificationsAsync();`, and clear the device token on logout. Also guard the backend endpoint so token updates are ignored when no active auth session is present.
- Needs backend change? yes — the server should reject token updates without a valid authenticated user and enforce user-token binding.
- Effort: M (half day)
- Confidence: High

### FE-004 · Auth restore trusts AsyncStorage blindly and never revalidates the session
- Severity: P1 (broken flow, likely in production)
- Category: C Auth & state
- File: src/context/AuthContext.js · Function/Component: checkLogin
- Find anchor: `const savedToken = await AsyncStorage.getItem('token');`
- Problem: The app restores the user directly from local storage without validating the token or checking whether the backend still considers the session valid. There is no `GET /auth/me` verification on launch, no expiry handling, and no explicit logout flow when the token has been revoked or rotated. This leaves the app in a stale authenticated state after a token expiry or cross-device logout.
- Failure scenario: A user logs out from another device or the backend invalidates the old token; the app relaunches with stale data still in AsyncStorage, keeps the user in a logged-in state, and then makes later API calls that fail with 401. The UX remains stuck in the authenticated flow with no clean reauth path, creating a broken “stuck logged in” state.
- Suggested fix: Validate the saved session on startup by calling `authAPI.getMe()` (or an equivalent validate endpoint) before trusting the persisted token, then clear storage and navigate to login if validation fails. Keep the fallback state explicit and avoid leaving stale auth cookies/token blobs active in local storage.
- Needs backend change? no — this can be handled with a standard 401/403 contract and a valid `getMe` check.
- Effort: M (half day)
- Confidence: High

### FE-005 · Push tokens and backend responses are logged in production builds
- Severity: P1 (data loss / money / security / crash)
- Category: A Security & privacy
- File: src/services/notifications.js · Function/Component: registerForPushNotificationsAsync
- Find anchor: `console.log('✅ PUSH TOKEN GENERATED:', token);`
- Problem: The app logs the Expo push token and backend response payloads to the console in production. Push tokens are device identifiers and are sensitive personal data; printing them in release logs can expose user identifiers and notification targets through crash reports or support tooling.
- Failure scenario: A user installs the app, the FCM token is generated, and the console output is captured in a crash report or support log. Anyone with access to those logs can tie a device ID to a user and target notifications or track account activity.
- Suggested fix: Remove production console logging for tokens and backend responses. Wrap debug output in `if (__DEV__)` or a structured logger that is disabled in production, and never log device or user identifiers in release builds.
- Needs backend change? no
- Effort: S (<30 min)
- Confidence: High

### Checked: OK list
- Checked: OK — the shared API instance in `src/services/api.js` centralizes request handling and keeps all auth calls on one axios client instead of sprinkling raw `fetch` or ad hoc requests across screens.
- Checked: OK — `AuthContext` correctly persists token and user data to AsyncStorage and keeps `login`, `logout`, and `updateUser` in one place, making the session lifecycle easier to reason about.
- Checked: OK — the notification handler config in `src/services/notifications.js` is consistent with Expo best practice (`setNotificationHandler` + Android channel setup) and avoids a broken default notification setup.

### Notes for the next pass
- Pass 1 identified high-value auth and privacy issues around FCM registration timing, stale-session trust, and console logging of sensitive device identifiers.
- Next up: Pass 2 will review the navigation layer (`src/navigation/index.js`) for auth gating, screen resets, and role-based entry behavior.
