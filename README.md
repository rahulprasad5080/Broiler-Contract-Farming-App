# Broiler Contract Farming App

Expo Router based React Native app for broiler contract farming operations. The app is organized around role-specific route groups for owners, supervisors, and farmers.

## Requirements

- Node.js 20.19.4 or newer is recommended for the installed Expo/React Native toolchain.
- Run `npm install` before starting development.

## Scripts

```bash
npm start          # Start Expo
npm run android    # Run Android native build
npm run ios        # Run iOS native build
npm run web        # Start Expo web
npm run lint       # Run Expo ESLint
npm test           # Run TypeScript test build and node tests
npm run docs:extract
```

## Project Structure

- `app/`: Expo Router screens, grouped by role: `(auth)`, `(owner)`, `(supervisor)`, `(farmer)`.
- `components/`: Shared screen and UI components used across route groups.
- `context/`: App-wide React providers such as auth and toast state.
- `hooks/`: Reusable hooks and hook controllers.
- `services/`: API clients, auth/session utilities, route guards, and pure helpers.
- `services/management/`: Domain-specific management API modules with shared API contracts in `types.ts`.
- `constants/`: Shared app constants such as colors and layout values.
- `docs/`: Backend API documents and extracted API reference output.
- `scripts/`: Local maintenance scripts.
- `__tests__/`: Node-based unit tests.

## API Docs

Backend API reference files are stored in `docs/`. To extract searchable text from the latest DOCX:

```bash
npm run docs:extract
```

The generated `docs/extracted-api.txt` is ignored by git.
