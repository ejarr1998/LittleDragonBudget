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
      // Check for updates on launch, when returning to the app, and every minute.
      reg.update()
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') reg.update()
      })
      // iOS Safari can fully suspend a backgrounded tab's JS rather than just
      // hiding it — timers and even visibilitychange can go quiet. When iOS
      // restores a page from that frozen state it fires 'pageshow' (with
      // event.persisted = true) rather than firing 'load' or a fresh
      // visibilitychange, so without this an app left backgrounded for a
      // while could keep running a stale build even after several deploys.
      window.addEventListener('pageshow', (e) => {
        if ((e as PageTransitionEvent).persisted) reg.update()
      })
      setInterval(() => reg.update(), 60_000)
    }).catch(() => { /* offline or unsupported — app still works */ })
  })
}
