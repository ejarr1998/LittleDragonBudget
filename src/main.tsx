import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

// PWA: register service worker with auto-update.
// When a new SW takes control, reload once so users always run the latest build.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })
    navigator.serviceWorker.register('./sw.js').then((reg) => {
      // Check for updates on launch, when returning to the app, and every minute
      reg.update()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update()
      })
      setInterval(() => reg.update(), 60_000)
    }).catch(() => { /* offline or unsupported — app still works */ })
  })
}
