import React, { useEffect, useState } from 'react'
import ProductsPage from './pages/ProductsPage/ProductsPage'

function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [showInstallButton, setShowInstallButton] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)

  useEffect(() => {
    // Handle PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
      console.log('BeforeInstallPrompt event fired')
    }

    // Handle online/offline status
    const handleOnline = () => {
      setIsOnline(true)
      console.log('App is online')
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.log('App is offline')
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt')
          setShowInstallButton(false)
        } else {
          console.log('User dismissed the install prompt')
        }
        setDeferredPrompt(null)
      })
    }
  }

  return (
    <>
      {!isOnline && (
        <div className="offline-indicator">
          🔌 Вы в офлайн-режиме. Некоторые функции могут быть ограничены.
        </div>
      )}
      {showInstallButton && (
        <div className="install-banner">
          <span>📱 Установите приложение на устройство</span>
          <button onClick={handleInstallClick} className="btn btn--primary">
            Установить
          </button>
        </div>
      )}
      <ProductsPage />
    </>
  )
}

export default App