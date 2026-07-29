// src/hooks/useRazorpay.ts
import { useCallback } from 'react'

export function useRazorpay() {
  const loadRazorpay = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      // If loaded via index.html script tag — already available
      if (window.Razorpay) {
        resolve(true)
        return
      }
      // Wait up to 3s for script to finish loading
      let attempts = 0
      const interval = setInterval(() => {
        attempts++
        if (window.Razorpay) {
          clearInterval(interval)
          resolve(true)
        } else if (attempts > 30) {
          clearInterval(interval)
          resolve(false)
        }
      }, 100)
    })
  }, [])

  return { loadRazorpay }
}