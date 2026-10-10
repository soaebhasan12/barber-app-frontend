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
