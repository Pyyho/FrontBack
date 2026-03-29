import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import reportWebVitals from './reportWebVitals'

// Register Service Worker
const registerServiceWorker = async () => {
  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported')
    return
  }

  try {
    // Wait for page to fully load
    await new Promise((resolve) => {
      if (document.readyState === 'complete') {
        resolve()
      } else {
        window.addEventListener('load', resolve)
      }
    })

    const registration = await navigator.serviceWorker.register('/sw.js')
    console.log('Service Worker registered with scope:', registration.scope)

    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing
      console.log('New Service Worker found:', newWorker)

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New update available! Refresh to update.')
          // Можно показать уведомление пользователю
        }
      })
    })

    // Handle controller change (new SW takes over)
    let refreshing = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      console.log('Service Worker controller changed, reloading...')
      window.location.reload()
    })

  } catch (error) {
    console.error('Service Worker registration failed:', error)
  }
}

// Register SW only in production or when explicitly enabled
if (process.env.NODE_ENV === 'production' || window.location.hostname === 'localhost') {
  registerServiceWorker()
}

const root = ReactDOM.createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

reportWebVitals()