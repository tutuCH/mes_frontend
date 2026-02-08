import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { VitePWA } from "vite-plugin-pwa"

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        injectRegister: null,
        includeAssets: [
          "pwa-192.png",
          "pwa-512.png",
          "apple-touch-icon.png",
          "offline.html",
        ],
        manifest: {
          name: "NEXUS MES",
          short_name: "NEXUS MES",
          start_url: "/",
          scope: "/",
          display: "standalone",
          theme_color: "#ffffff",
          background_color: "#f8fafc",
          icons: [
            {
              src: "/pwa-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/pwa-512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
        workbox: {
          cleanupOutdatedCaches: true,
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [
            /^\/api\//,
            /^\/sse\//,
            /^\/socket\.io\//,
            /\/assets\//,
          ],
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "image-cache",
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: ({ url, request }) => {
                if (request.method !== "GET") return false
                const origin = (globalThis as { location?: { origin?: string } }).location?.origin
                if (!origin || url.origin !== origin) return false
                if (url.pathname.startsWith("/sse")) return false
                if (url.pathname.startsWith("/socket.io")) return false
                return /^\/(auth|factories|machines|subscriptions|user|health|api)(\/|$)/.test(
                  url.pathname,
                )
              },
              handler: "NetworkFirst",
              options: {
                cacheName: "api-get",
                networkTimeoutSeconds: 3,
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60,
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true,
        },
      }),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  }
})
