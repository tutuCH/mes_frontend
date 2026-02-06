import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import { store } from './store'
import './index.css'
import App from './App.tsx'
import { createLogger } from '@/utils/logger'
import { registerSW } from 'virtual:pwa-register'
import { initIosViewportFix } from '@/utils/iosViewport'

const logger = createLogger('main')
initIosViewportFix()

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister().catch((error) => {
        logger.warn('Failed to unregister service worker', error)
      })
    })
  }).catch((error) => {
    logger.warn('Failed to fetch service worker registrations', error)
  })
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  registerSW({ immediate: true })
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </StrictMode>,
)
