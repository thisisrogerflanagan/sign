'use client'

import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function NetworkStatusBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    function handleOnline() {
      setIsOffline(false)
    }
    function handleOffline() {
      setIsOffline(true)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    setIsOffline(!navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="bg-amber-600 text-white text-xs px-4 py-2 text-center font-medium flex items-center justify-center gap-2 sticky top-0 z-50 animate-in slide-in-from-top">
      <WifiOff className="h-3.5 w-3.5" />
      <span>You appear to be offline. Any edits or signatures will be synced once your connection returns.</span>
    </div>
  )
}
