import { useEffect, useRef } from 'react'

/**
 * Hook to auto-initialize card types when the app loads
 */
export function useCardTypesInitialization(sidepanelCode: string, onUpdateTypes?: (cardTypes: { colors: Record<string, string>, layouts: Record<string, Record<string, boolean>> }) => void) {
  const hasInitialized = useRef(false)

  useEffect(() => {
    // Only run once when the app loads
    if (hasInitialized.current || !sidepanelCode || !onUpdateTypes) return
    
    hasInitialized.current = true
    
    const executeInitialCode = async () => {
      try {
        console.log("Auto-initializing card types...")
        
        const response = await fetch('http://localhost:8000/execute-code', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code: sidepanelCode }),
        })
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }
        
        const data = await response.json()
        
        if (data.success && data.card_types) {
          onUpdateTypes({
            colors: data.card_types.colors,
            layouts: data.card_types.layouts
          })
          console.log("Card types auto-initialized successfully")
        } else {
          console.warn("Failed to auto-initialize card types:", data.error)
        }
      } catch (err) {
        console.warn("Failed to auto-initialize card types:", err instanceof Error ? err.message : 'Unknown error')
      }
    }

    executeInitialCode()
  }, [sidepanelCode, onUpdateTypes])
}