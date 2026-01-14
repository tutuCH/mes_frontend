# Frontend Production Integration

This guide documents how the frontend connects to the production backend and how to configure Vercel for deployment.

## Production Endpoints
- REST API base URL: `https://api-dashboard.harrytu.cv`
- WebSocket URL (Socket.IO): `https://api-dashboard.harrytu.cv`
  - Socket.IO negotiates `wss://` automatically when the page is served over HTTPS.
  - Do not use raw `ws://` URLs in production.

## Environment Variables (Vite)
The frontend reads environment variables at build time using `import.meta.env`.

Required variables:
- `VITE_API_URL=https://api-dashboard.harrytu.cv`
- `VITE_WS_URL=https://api-dashboard.harrytu.cv`
- `VITE_GOOGLE_CLIENT_ID=<your-google-client-id>` (if Google SSO is enabled)

### Local production simulation
Create `.env.dev` locally (do not commit secrets):
```
VITE_API_URL=https://api-dashboard.harrytu.cv
VITE_WS_URL=https://api-dashboard.harrytu.cv
VITE_GOOGLE_CLIENT_ID=
```
Run a production build to verify:
- `npm run build`
- `npm run preview`

## Vercel Deployment
Set the following **Environment Variables** in the Vercel project settings:
- `VITE_API_URL=https://api-dashboard.harrytu.cv`
- `VITE_WS_URL=https://api-dashboard.harrytu.cv`
- `VITE_GOOGLE_CLIENT_ID=<your-google-client-id>` (if used)

Vercel injects these during the build step. Redeploy after updating variables.

## Backend CORS & Auth
Ensure the backend allows the production frontend origin:
- Add the Vercel production domain to the backend CORS allowlist.
- Keep `FRONTEND_URL` env aligned with the deployed frontend URL.

Auth behavior:
- JWT token stored in `localStorage` under `auth_token`.
- Every protected request requires `Authorization: Bearer <token>`.

## WebSocket Notes
- The frontend uses Socket.IO via `src/services/socket.ts`.
- The connection uses the same base host as the REST API.
- Do not disconnect the socket on component unmount; `GlobalWebSocketManager` owns lifecycle.

## Verification Checklist
- Production build uses `VITE_API_URL` and `VITE_WS_URL` values above.
- WebSocket connects successfully over HTTPS.
- API requests succeed without CORS errors.
- Authenticated routes work after login.

## Reference Files
- `src/services/api.ts`
- `src/services/socket.ts`
- `.env.example`
- `.env.development`
- `.env.dev`
