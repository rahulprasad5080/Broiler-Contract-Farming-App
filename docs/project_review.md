# Broiler Contract Farming App: Codebase & Architecture Review

This document provides a detailed architectural and code quality review of the **Broiler Contract Farming React Native App** (built with Expo, React Native, and TypeScript).

---

## 1. Project Overview

The **Broiler Contract Farming App** is an Expo Router-based React Native mobile application designed to manage broiler farming contract operations. It divides functionality based on user roles, specifically tailoring experiences for **Owners**, **Supervisors**, and **Farmers**. The frontend is fully integrated with a versioned backend API (93 routes under `/api/v1` and 4 support routes).

---

## 2. Directory Structure & Architecture

The codebase adheres to clean separation of concerns:

```
├── app/                      # Expo Router screens (role-specific folders)
│   ├── (auth)/               # Authentication & session unlock screens
│   ├── (farmer)/             # Farmer-specific dashboard & tasks
│   ├── (owner)/              # Owner dashboard, finance, management
│   ├── (supervisor)/         # Supervisor dashboard & operational flows
│   ├── _layout.tsx           # Global entry, providers, notification & offline hooks
│   └── index.tsx             # Redirects to auth entry
├── components/               # Reusable UI elements
│   ├── navigation/           # Shared navigation layout elements
│   ├── screens/              # Heavy screen controllers (reports, entries, etc.)
│   └── ui/                   # Reusable atomic UI components (Buttons, Selects, etc.)
├── context/                  # Global React contexts (Auth, Sidebar, Toast)
├── hooks/                    # Reusable React Hooks (offline queue, form persistence)
├── services/                 # API Clients, validators, security, sync policies
└── __tests__/                # Automated test suites
```

---

## 3. Core Architecture Evaluation

### 3.1 Session Bootstrapping & Security
The entry point of the app runs through [app/_layout.tsx](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/app/_layout.tsx) and coordinates context initialization via [context/AuthContext.tsx](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/context/AuthContext.tsx).

*   **Quick Lock / Unlock**: Implements a PIN and Biometric security layer. When the app is backgrounded for over 5 minutes (`BACKGROUND_LOCK_TIMEOUT_MS = 300000`), it locks itself automatically, requiring the user to unlock via PIN or biometrics upon returning.
*   **Token Refresh & Auto-Hydration**: Upon mounting, the auth provider pulls session tokens from secure storage. It automatically requests a silent token refresh (`/auth/refresh`) and fetches the current profile (`/auth/me`).

### 3.2 Role-Based Routing & Access Control
Access rules are enforced dynamically at the routing level in [services/routeGuards.ts](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/services/routeGuards.ts):
*   A guard function `isRouteAllowedForRole` maps segment routes (e.g. `(owner)`, `(farmer)`, `(supervisor)`) and verifies if the user's role is permitted to load those routes.
*   Granular user permissions (e.g. `create:sales`, `view:financial-dashboard`, `approve:farmer-expense`) are resolved either from the API response payload or mapped directly to role defaults if API permissions are unavailable.

### 3.3 Offline-First Sync Queue
A crucial feature for remote farming locations is the offline sync capabilities defined in:
*   [services/offlineSyncQueue.ts](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/services/offlineSyncQueue.ts): Manages an `AsyncStorage`-backed queue of offline actions (daily entries, daily entry updates, expenses, sales entries, and treatment entries). It checks connectivity using `@react-native-community/netinfo`.
*   [hooks/useOfflineSyncQueue.ts](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/hooks/useOfflineSyncQueue.ts): Monitors network status. As soon as the device reconnects to the internet, it triggers the sync processor in the background and surfaces toast notifications indicating success or failure.

### 3.4 Draft Form Auto-Saving & Restoration
To prevent data loss from app crashes, minimization, or navigation interrupts, the app implements:
*   [hooks/useFormPersistence.ts](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/hooks/useFormPersistence.ts): Couples with `react-hook-form` to auto-save drafts to local storage as the user types.
*   [hooks/formPersistenceController.ts](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/hooks/formPersistenceController.ts): Provides debounced scheduling for database writes. If the app goes to the background, it performs a blocking write of the draft immediately.

---

## 4. Key Screens Analysis

### 4.1 Owner Dashboard
Defined in [app/(owner)/dashboard.tsx](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/app/%28owner%29/dashboard.tsx):
*   **Visual Richness**: Implements premium UI cards showcasing key statistics like active batches, live birds, today's mortality, and total mortality.
*   **Action Required Hub**: Surfaces immediate notifications for pending daily entries, feed alerts, and Feed Conversion Ratio (FCR) anomalies.
*   **Interactive Finance Widget**: Displays organization investment, expenses, sales, and net profit/loss. Recent transactions include color-coded directions (green for inbound, red for outbound).
*   **Quick Action FAB**: Includes a dynamic overlay panel which pops up with micro-animations when clicked, offering rapid entry templates (e.g., adding batch, purchase, sale, or expense).

### 4.2 Farmer Dashboard
Defined in [app/(farmer)/dashboard.tsx](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/app/%28farmer%29/dashboard.tsx):
*   **Weather Integration**: Dynamically queries the Open-Meteo API using the farmer's current coordinates (`Location.getCurrentPositionAsync`).
*   **Actionable Weather Alerts**: Displays smart advisory warnings, e.g.:
    *   *High probability of rain* -> advisory to "keep litter dry".
    *   *Extreme heat warning (>= 34°C)* -> advisory to "check ventilation".
    *   *High wind speeds* -> advisory to "secure curtains".
*   **Task Center**: Lists today's pending tasks such as submitting daily flock sheets or recording treatment logs.

---

## 5. Review Findings & Code Health

### 5.1 Strong Architectural Patterns
*   **Pass-by-Value Error Normalization**: The API service helper [services/api.ts](file:///d:/rocky%20bhai/Broiler-Contract-Farming-App/services/api.ts) safely parses nested error structures from the backend. Instead of throwing raw network errors, it extracts specific validation messages (`details` / `fields` / `errors` arrays) and normalizes them for the UI.
*   **Global Toast Handler**: System-wide toast configurations in `_layout.tsx` enforce safe screen positioning and elegant layouts.
*   **Robust Test Suite**: The project includes 25 unit tests covering token revocation, date formatting, route guards, offline queue processing, and transaction rules. Running `npm test` yields a 100% success rate:
    ```bash
    # tests 25
    # pass 25
    # fail 0
    ```

### 5.2 Minor Areas for Optimization
*   **API URL Configuration**: The default base URL falls back to a hardcoded Vercel link (`https://broiler-dusky.vercel.app/api/v1`) if the environment variable is missing. It is recommended to verify local configurations when connecting to local test endpoints (`http://localhost:4000/api/v1`).
*   **Biometrics UI Feedback**: In biometrics login, ensure fallback screen states are gracefully handled when hardware is missing.

---

## 6. Actionable Next Steps
1.  **Run Dev Environment**: Start the Expo dev server with `npm start` or run Web mode with `npm run web` to preview the screens locally.
2.  **Verify Backend Connectivity**: Update your local `.env` values to direct API calls to your active backend environment.
3.  **Localize Layouts**: Translate weather advisories or dashboards into local regional languages if required, matching the demographic profile of the target farm supervisors and farmers.
