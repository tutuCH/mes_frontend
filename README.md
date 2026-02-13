# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
  ])
```

## PWA Testing

Run a production build and preview:

```bash
npm run build
npm run preview
```

Then open the preview URL (default `http://localhost:4173`) and run Lighthouse from Chrome DevTools.

## PWA QA Checklist

- Android: install prompt appears and launches in standalone.
- iOS Safari: Add to Home Screen works, icon/title correct.
- Offline: app shell loads and offline screen appears.
- API caching: GET requests fall back briefly but do not stay stale.
- No regressions in auth, routing, or SSE behavior.

## Cognito Auth Setup

Required environment variables:

```bash
VITE_API_URL=http://localhost:3000
VITE_COGNITO_REGION=ap-southeast-1
VITE_COGNITO_USER_POOL_ID=ap-southeast-1_xxxxxxxx
VITE_COGNITO_WEB_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_DOMAIN=your-domain.auth.ap-southeast-1.amazoncognito.com
VITE_COGNITO_REDIRECT_SIGN_IN=http://localhost:5173/login
VITE_COGNITO_REDIRECT_SIGN_OUT=http://localhost:5173/login
VITE_DEBUG_SSE=false
```

Important:
- Legacy backend credentials (for example `tuchenhsien@gmail.com / abc123`) do not work unless that user is also created and confirmed in the configured Cognito User Pool.

### Run Web

```bash
npm install
npm run dev
```

### React Native

This repository currently contains only the web app. React Native secure-storage integration should be implemented in the RN workspace using `expo-secure-store` (Expo) or `@react-native-async-storage/async-storage` (baseline).

### Verify Auth Behavior

1. Sign in with email/password and refresh the browser: session should remain authenticated.
2. Close and reopen the browser tab: session should remain authenticated.
3. Use forgot-password + code reset flow: reset should complete and allow sign-in.
4. Use sign-up + confirmation code flow: account confirmation should complete and allow sign-in.
5. Sign in with Google button (Hosted UI): should return to `/login` and then to the intended route.
6. Trigger logout from sidebar/settings: app should return to login and stay logged out after refresh.
7. Keep app open past access-token lifetime and perform API/SSE operations: requests should continue working via refresh token flow.
